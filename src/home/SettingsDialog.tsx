import {
  Box,
  Container,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import React from "react";
import { useAppSelector } from "../app/store";

import {
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";

function DialogToolbar({
  onClose,
  title,
  endAdornment,
}: {
  onClose: () => void;
  title: string;
  endAdornment?: React.ReactNode;
}) {
  return (
    <Toolbar disableGutters sx={{ height: "60px" }}>
      <Box
        sx={{
          height: "100%",
          aspectRatio: "1 / 1",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <IconButton aria-label="Close" size="large" onClick={onClose}>
          <NavigateBeforeIcon />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Typography variant="h6">{title}</Typography>
      <Box sx={{ flexGrow: 1 }} />
      {endAdornment ? (
        <Box
          sx={{
            height: "100%",
            aspectRatio: "1 / 1",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {endAdornment}
        </Box>
      ) : (
        <Box sx={{ height: "100%", aspectRatio: "1 / 1" }} />
      )}
    </Toolbar>
  );
}

function AccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const nickname = useAppSelector((state) => state.settings.nickname);

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
              <ListItemButton>
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

function ConnectionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const protocol = useAppSelector((state) => state.settings.protocol);

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
              <ListItemButton>
                <ListItemText
                  primary="Protocol"
                  secondary={protocol}
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
