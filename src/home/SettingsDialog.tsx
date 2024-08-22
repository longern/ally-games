import {
  Container,
  Dialog,
  DialogContent,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import React from "react";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "../app/store";
import { setSettings } from "../app/settings";
import DialogToolbar from "./DialogToolbar";
import ConnectionDialog from "./ConnectionDialog";

function AccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const nickname = useAppSelector((state) => state.settings.nickname);

  const dispatch = useAppDispatch();

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Container maxWidth="md" sx={{ padding: 0, flexShrink: 0 }}>
        <DialogToolbar onClose={onClose} title="Account" />
      </Container>
      <Divider />
      <DialogContent sx={{ padding: 0 }}>
        <Container maxWidth="md" sx={{ padding: 0 }}>
          <List
            disablePadding
            sx={{ "& .MuiListItemButton-root": { minHeight: "60px" } }}
          >
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  const nickname = window.prompt("Enter your nickname");
                  if (!nickname) return;
                  dispatch(setSettings({ value: { nickname } }));
                }}
              >
                <ListItemText
                  primary="Nickname"
                  secondary={nickname}
                ></ListItemText>
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
          </List>
        </Container>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [showAccount, setShowAccount] = React.useState(false);
  const [showConnection, setShowConnection] = React.useState(false);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Container maxWidth="md" sx={{ padding: 0, flexShrink: 0 }}>
        <DialogToolbar onClose={onClose} title="Settings" />
      </Container>
      <Divider />
      <DialogContent sx={{ padding: 0 }}>
        <Container maxWidth="md" sx={{ padding: 0 }}>
          <List
            disablePadding
            sx={{ "& .MuiListItemButton-root": { minHeight: "60px" } }}
          >
            <ListItem disablePadding>
              <ListItemButton onClick={() => setShowAccount(true)}>
                <ListItemText primary="Account"></ListItemText>
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setShowConnection(true)}>
                <ListItemText primary="Connection"></ListItemText>
                <NavigateNextIcon />
              </ListItemButton>
            </ListItem>
          </List>
        </Container>
      </DialogContent>
      <AccountDialog open={showAccount} onClose={() => setShowAccount(false)} />
      <ConnectionDialog
        open={showConnection}
        onClose={() => setShowConnection(false)}
      />
    </Dialog>
  );
}

export default SettingsDialog;
