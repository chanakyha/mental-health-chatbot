interface Chat {
  id: number;
  created_at: string;
  user_id: string;
}

interface Message {
  id: number;
  created_at: string;
  chat_id: number;
  user_input: string;
  bot_response: string;
}
