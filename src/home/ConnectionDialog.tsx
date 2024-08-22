import {
  Box,
  Button,
  Container,
  Dialog,
  DialogContent,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import React, { useCallback, useEffect } from "react";
import {
  Check as CheckIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "../app/store";
import DialogToolbar from "./DialogToolbar";
import { setSettings, TurnServer } from "../app/settings";

const defaultTurnServer = {
  type: "custom" as const,
  urls: "",
  username: "",
  credential: "",
};

function TurnServerEditor({
  open,
  onClose,
  value,
  onChange,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  value?: TurnServer | undefined;
  onChange: (turnServer: TurnServer) => void;
  onDelete?: () => void;
}) {
  const [turnServer, setTurnServer] = React.useState(
    value ?? defaultTurnServer
  );

  useEffect(() => {
    setTurnServer(value ?? defaultTurnServer);
  }, [value]);

  const handleSave = useCallback(() => {
    onChange(turnServer);
  }, [onChange, turnServer]);

  const handleDelete = useCallback(() => {
    const confirm = window.confirm("Delete TURN Server?");
    if (confirm) onDelete();
  }, [onDelete]);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Container maxWidth="md" sx={{ padding: 0, flexShrink: 0 }}>
        <DialogToolbar
          onClose={onClose}
          title="TURN Server"
          endAdornment={
            <IconButton aria-label="Save" onClick={handleSave}>
              <CheckIcon />
            </IconButton>
          }
        />
      </Container>
      <Divider />
      <DialogContent>
        <Container maxWidth="md" sx={{ padding: 0 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={turnServer.type}
                onChange={(e) => {
                  const value = e.target.value as "custom" | "cloudflare";
                  if (value === "custom") {
                    setTurnServer({
                      type: "custom",
                      urls: "",
                      username: "",
                      credential: "",
                    });
                  } else {
                    setTurnServer({
                      type: "cloudflare",
                      keyId: "",
                      keyToken: "",
                      customDomain: "",
                    });
                  }
                }}
              >
                <MenuItem value="custom">Custom</MenuItem>
                <MenuItem value="cloudflare">Cloudflare</MenuItem>
              </Select>
            </FormControl>
            {turnServer.type === "custom" ? (
              <>
                <TextField
                  label="URLs"
                  fullWidth
                  value={turnServer.urls}
                  onChange={(e) =>
                    setTurnServer({ ...turnServer, urls: e.target.value })
                  }
                />
                <TextField
                  label="Username"
                  fullWidth
                  value={turnServer.username}
                  onChange={(e) =>
                    setTurnServer({ ...turnServer, username: e.target.value })
                  }
                />
                <TextField
                  label="Credential"
                  fullWidth
                  value={turnServer.credential}
                  onChange={(e) =>
                    setTurnServer({ ...turnServer, credential: e.target.value })
                  }
                />
              </>
            ) : (
              <>
                <TextField
                  label="Key ID"
                  fullWidth
                  value={turnServer.keyId}
                  onChange={(e) =>
                    setTurnServer({ ...turnServer, keyId: e.target.value })
                  }
                />
                <TextField
                  label="Key Token"
                  fullWidth
                  value={turnServer.keyToken}
                  onChange={(e) =>
                    setTurnServer({ ...turnServer, keyToken: e.target.value })
                  }
                />
                <TextField
                  label="Custom Domain"
                  fullWidth
                  value={turnServer.customDomain}
                  onChange={(e) =>
                    setTurnServer({
                      ...turnServer,
                      customDomain: e.target.value,
                    })
                  }
                />
              </>
            )}
            {value && onDelete && (
              <Box>
                <Button size="large" color="error" onClick={handleDelete}>
                  Delete TURN Server
                </Button>
              </Box>
            )}
          </Stack>
        </Container>
      </DialogContent>
    </Dialog>
  );
}

function WebRTCSettings() {
  const turnServers = useAppSelector((state) => state.settings.turnServers);
  const [editingTurnServer, setEditingTurnServer] = React.useState<
    TurnServer | undefined
  >(undefined);
  const [showTurnServerEditor, setShowTurnServerEditor] = React.useState(false);

  const dispatch = useAppDispatch();

  return (
    <>
      <List disablePadding>
        <ListItem>
          <ListItemText primary="Signaling server" />
        </ListItem>
        <ListItem>
          <ListItemText primary="TURN Server" />
        </ListItem>
        <ListItem disablePadding>
          <List
            disablePadding
            sx={{
              width: "100%",
              paddingLeft: 2,
              "& .MuiListItemButton-root": { minHeight: "60px" },
            }}
          >
            {(turnServers || []).map((turnServer, index) => (
              <ListItem key={index} disablePadding>
                <ListItemButton
                  onClick={() => {
                    setEditingTurnServer(turnServer);
                    setShowTurnServerEditor(true);
                  }}
                >
                  <ListItemText
                    primary={
                      turnServer.type === "custom"
                        ? turnServer.urls
                        : turnServer.keyId
                    }
                  />
                  <NavigateNextIcon />
                </ListItemButton>
              </ListItem>
            ))}
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  setEditingTurnServer(undefined);
                  setShowTurnServerEditor(true);
                }}
              >
                <ListItemText primary="Add TURN Server" />
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
          </List>
        </ListItem>
      </List>
      <TurnServerEditor
        open={showTurnServerEditor}
        onClose={() => setShowTurnServerEditor(false)}
        value={editingTurnServer}
        onChange={(turnServer) => {
          const newTurnServers = editingTurnServer
            ? turnServers.map((ts) =>
                ts === editingTurnServer ? turnServer : ts
              )
            : [...(turnServers ?? []), turnServer];
          dispatch(setSettings({ value: { turnServers: newTurnServers } }));
          setEditingTurnServer(undefined);
          setShowTurnServerEditor(false);
        }}
        onDelete={() => {
          if (!editingTurnServer) return;
          const newTurnServers = turnServers.filter(
            (ts) => ts !== editingTurnServer
          );
          dispatch(setSettings({ value: { turnServers: newTurnServers } }));
          setEditingTurnServer(undefined);
          setShowTurnServerEditor(false);
        }}
      />
    </>
  );
}

function ConnectionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [showProtocolDialog, setShowProtocolDialog] = React.useState(false);
  const protocol = useAppSelector((state) => state.settings.protocol);

  const dispatch = useAppDispatch();

  const protocolVerbose = {
    "broadcast-channel": "Broadcast Channel",
    webrtc: "WebRTC",
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Container maxWidth="md" sx={{ padding: 0, flexShrink: 0 }}>
        <DialogToolbar onClose={onClose} title="Connection" />
      </Container>
      <Divider />
      <DialogContent sx={{ padding: 0 }}>
        <Container maxWidth="md" sx={{ padding: 0 }}>
          <List
            disablePadding
            sx={{ "& .MuiListItemButton-root": { minHeight: "60px" } }}
          >
            <ListItem disablePadding>
              <ListItemButton onClick={() => setShowProtocolDialog(true)}>
                <ListItemText
                  primary="Protocol"
                  secondary={protocolVerbose[protocol]}
                ></ListItemText>
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
          </List>
          <Divider variant="middle" />
          {protocol === "webrtc" && <WebRTCSettings />}
        </Container>
      </DialogContent>

      <Dialog
        open={showProtocolDialog}
        onClose={() => setShowProtocolDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <List
          disablePadding
          sx={{ "& .MuiListItemButton-root": { minHeight: "60px" } }}
        >
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                dispatch(
                  setSettings({ value: { protocol: "broadcast-channel" } })
                );
                setShowProtocolDialog(false);
              }}
            >
              <ListItemText primary={protocolVerbose["broadcast-channel"]} />
              {protocol === "broadcast-channel" && (
                <CheckIcon color="success" />
              )}
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                dispatch(setSettings({ value: { protocol: "webrtc" } }));
                setShowProtocolDialog(false);
              }}
            >
              <ListItemText primary={protocolVerbose["webrtc"]} />
              {protocol === "webrtc" && <CheckIcon color="success" />}
            </ListItemButton>
          </ListItem>
        </List>
      </Dialog>
    </Dialog>
  );
}

export default ConnectionDialog;
