import {
  Box,
  Container,
  Dialog,
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
  Close as CloseIcon,
  NavigateNext as NavigateNextIcon,
} from "@mui/icons-material";

function SettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const protocol = useAppSelector((state) => state.settings.protocol);

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Toolbar disableGutters>
        <Container
          maxWidth="md"
          sx={{
            height: "100%",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
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
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="h6">Settings</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ height: "100%", aspectRatio: "1 / 1" }} />
        </Container>
      </Toolbar>
      <Divider />
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
    </Dialog>
  );
}

export default SettingsDialog;
