import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      "Choose a card": "Choose a card",
      "Choose a player": "Choose a player",
      "Choose an action": "Choose an action",
      "Next step": "Next step",
      "Next round": "Next round",
      "hand-of": "Hand of {{player}}",
      "Waiting for other players...": "Waiting for other players...",

      Emergency: "Emergency",
      Vote: "Vote",
      Videocam: "Videocam",
      Trade: "Trade",
      Vault: "Vault",
    },
  },
  "zh-CN": {
    translation: {
      "Choose a card": "选择一张牌",
      "Choose a player": "选择一名玩家",
      "Choose an action": "选择一个行动",
      "Next step": "下一步",
      "Next round": "下一轮",
      "hand-of": "{{player}}的手牌",
      "Waiting for other players...": "等待其他玩家...",

      Emergency: "警报",
      Vote: "投票",
      Videocam: "监控",
      Trade: "交易",
      Vault: "牌库",
    },
  },
};

i18n.use(LanguageDetector).init({
  resources,
  detection: { order: ["navigator"] },

  interpolation: { escapeValue: false },
});

export default i18n;
