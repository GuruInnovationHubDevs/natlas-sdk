# Using natlas-js in React Native

The JavaScript SDK runs in React Native (Expo or bare). React Native's `fetch` can't stream response bodies, so `chatStream` automatically switches to `XMLHttpRequest` there. You don't need any polyfill.

## Install

```bash
npm install natlas-js
```

## Keep the token off the phone

Don't put your N-ATLAS endpoint token in the app. Point the SDK at a backend that holds it. The playground server in this repository works as one: it accepts `POST /v1/chat/completions`, adds the token on the server and forwards the request to N-ATLAS.

```js
import { NAtlas } from "natlas-js";

export const natlas = new NAtlas({ baseURL: "https://your-backend.example.com" }); // no apiKey in the app
```

## A streaming chat hook

```jsx
import { useCallback, useRef, useState } from "react";
import { natlas } from "./natlas";

export function useNAtlasChat(language = "yo") {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState("");
  const [error, setError] = useState(null);
  const abort = useRef(null);

  const send = useCallback(async (text) => {
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming("");
    setError(null);
    abort.current = new AbortController();
    let answer = "";
    try {
      for await (const chunk of natlas.chatStream({ messages: next, language, signal: abort.current.signal })) {
        answer += chunk;
        setStreaming(answer);
      }
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (e) {
      setError(e.message);
    } finally {
      setStreaming("");
    }
  }, [messages, language]);

  return { messages, streaming, error, send, stop: () => abort.current?.abort() };
}
```

```jsx
import { useState } from "react";
import { Button, FlatList, Text, TextInput, View } from "react-native";
import { ATTRIBUTION } from "natlas-js";
import { useNAtlasChat } from "./useNAtlasChat";

export default function ChatScreen() {
  const { messages, streaming, error, send } = useNAtlasChat("ha");
  const [text, setText] = useState("");
  const items = streaming ? [...messages, { role: "assistant", content: streaming }] : messages;
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList data={items} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <Text>{item.content}</Text>} />
      {error && <Text style={{ color: "red" }}>{error}</Text>}
      <TextInput value={text} onChangeText={setText} placeholder="Ask in Hausa, Igbo, Yoruba or English" />
      <Button title="Send" onPress={() => { send(text); setText(""); }} />
      <Text style={{ fontSize: 11 }}>{ATTRIBUTION}</Text>
    </View>
  );
}
```

## Forcing a transport

`transport: "auto"` (the default) picks XMLHttpRequest on React Native and fetch elsewhere. Set `transport: "xhr"` or `"fetch"` to override.
