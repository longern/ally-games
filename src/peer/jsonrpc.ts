import { Connection } from "./types";

export function jsonRpcWrapper<
  RF extends object,
  LF extends Record<string, (...args: any[]) => Promise<any>> = {}
>(
  connection: Connection,
  options?: {
    remotePrefix?: string;
    localFunctions?: LF;
    localPrefix?: string;
    timeout?: number;
  }
) {
  const remotePrefix = options?.remotePrefix ?? "";
  const localPrefix = options?.localPrefix ?? "";
  const localFunctions = options?.localFunctions ?? ({} as LF);

  let id = 0;
  const pendingRequests = {} as Record<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
    }
  >;

  const listener = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    if (data.jsonrpc !== "2.0") return;
    if ("result" in data) {
      const request = pendingRequests[data.id];
      if (request) request.resolve(data.result);
      delete pendingRequests[data.id];
    } else if ("error" in data) {
      const request = pendingRequests[data.id];
      if (request) request.reject(new Error(data.error));
      delete pendingRequests[data.id];
    } else if ("method" in data && data.method.startsWith(localPrefix)) {
      const method = data.method.replace(localPrefix, "");
      const localFunction = localFunctions?.[method];
      if (!localFunction) return;
      if (!("params" in data)) data.params = [];
      if (!Array.isArray(data.params)) data.params = [data.params];
      const resultPromise = localFunction(...data.params);
      resultPromise
        .then((result) => {
          data.id &&
            connection.send(
              JSON.stringify({
                jsonrpc: "2.0",
                result,
                id: data.id,
              })
            );
        })
        .catch((error) => {
          connection.send(
            JSON.stringify({
              jsonrpc: "2.0",
              error,
              id: data.id,
            })
          );
        });
    }
  };

  const methodsProxy = new Proxy({} as RF, {
    get(_, method: string) {
      return (...args: any[]) => {
        const promise = new Promise((resolve, reject) => {
          pendingRequests[`${remotePrefix}${id}`] = { resolve, reject };
          if (options?.timeout) {
            setTimeout(() => {
              delete pendingRequests[id];
              reject(new Error(`Method ${method} imeout`));
            }, options.timeout);
          }
        });
        connection.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: `${remotePrefix}${method}`,
            params: args,
            id: `${remotePrefix}${id++}`,
          })
        );
        return promise;
      };
    },
  });

  const notifyProxy = new Proxy({} as RF, {
    get(_, method: string) {
      return (...args: any[]) => {
        connection.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: `${remotePrefix}${method}`,
            params: args,
          })
        );
      };
    },
  });

  connection.addEventListener("message", listener);
  function close() {
    connection.removeEventListener("message", listener);
  }

  return {
    methods: methodsProxy,
    notify: notifyProxy,
    connection,
    close,
  };
}
