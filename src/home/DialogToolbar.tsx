import { Box, IconButton, Toolbar, Typography } from "@mui/material";
import React from "react";
import { NavigateBefore as NavigateBeforeIcon } from "@mui/icons-material";

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

export default DialogToolbar;
