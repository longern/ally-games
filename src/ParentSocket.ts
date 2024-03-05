export class ParentSocket extends EventTarget {
  #handler: (event: MessageEvent) => void;

  constructor() {
    super();
    this.#handler = (event: MessageEvent<string>) => {
      if (event.source !== window.parent) return;
      if (typeof event.data !== "string") return;
      const { data } = event;
      this.dispatchEvent(new MessageEvent("message", { data }));
    };
    window.addEventListener("message", this.#handler);
  }

  send(data: string) {
    window.parent.postMessage(data, "*");
  }

  close() {
    window.removeEventListener("message", this.#handler);
  }
}
