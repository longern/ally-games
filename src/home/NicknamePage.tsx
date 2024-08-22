import { Box, Button, Stack, TextField } from "@mui/material";
import React from "react";

import { setSettings } from "../app/settings";
import { useAppDispatch } from "../app/store";

function NicknamePage() {
  const [nickname, setNickname] = React.useState("");
  const dispatch = useAppDispatch();

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Stack spacing={4}>
        <TextField
          label="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          fullWidth
        />
        <Button
          size="large"
          variant="contained"
          onClick={() => {
            dispatch(setSettings({ value: { nickname } }));
          }}
        >
          Continue
        </Button>
      </Stack>
    </Box>
  );
}

export default NicknamePage;
