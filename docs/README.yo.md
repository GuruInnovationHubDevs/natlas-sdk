# natlas-js (Ìtọ́sọ́nà ní èdè Yorùbá)

**natlas-js jẹ́ SDK fún TypeScript àti JavaScript, pẹ̀lú ojú-òpó ìdánwò (playground), fún [N-ATLAS](https://huggingface.co/NCAIR1/N-ATLaS): àwòṣe èdè ńlá ti Nàìjíríà tí ó ń sọ Gẹ̀ẹ́sì, Hausa, Igbo àti Yorùbá.**

[English version](../README.md)

---

## Kí ni ó ń ṣe?

Ọ̀pọ̀lọpọ̀ olùgbéejáde (developers) ní Nàìjíríà ló ń lo JavaScript láti kọ́ àwọn ohun èlò wẹ́ẹ̀bù àti fóònù. Láti lo N-ATLAS, wọ́n ní láti kọ ìpè HTTP, ọ̀nà ìbéèrè (prompt), àti ìṣàkóso àṣìṣe fúnra wọn. `natlas-js` ń ṣe gbogbo iṣẹ́ yìí fún ọ nínú àpò kan ṣoṣo tí kò nílò àpò mìíràn.

- **Oníbàárà kan fún gbogbo olùpín N-ATLAS**: Hugging Face Inference Endpoints, vLLM tàbí TGI
- **Èdè ìdáhùn**: fi `language: "yo"` (tàbí `"ha"`, `"ig"`, `"en"`) sí i, N-ATLAS yóò sì dáhùn ní èdè náà
- **Ìdáhùn ní ṣísẹ̀-n-tẹ̀lé (streaming)**: `for await (const chunk of natlas.chatStream(...))`
- **Àwọn iṣẹ́ ìrànlọ́wọ́**: `ask` (béèrè), `translate` (túmọ̀), `summarize` (ṣàkópọ̀), `health` (ṣàyẹ̀wò)
- **Ààbò iṣẹ́**: àkókò ìdádúró, ìgbìyànjú-lẹ́ẹ̀kan-sí (retries), àti àṣìṣe tí ó ní orúkọ (`NAtlasError`)

## Bí a ṣe ń fi sí i

```bash
npm install natlas-js
```

## Ìbẹ̀rẹ̀ kíákíá

```js
import { NAtlas } from "natlas-js";

const natlas = new NAtlas({
  baseURL: process.env.NATLAS_BASE_URL, // àdírẹ́sì olùpín N-ATLAS rẹ
  apiKey: process.env.NATLAS_API_KEY,   // kọ́kọ́rọ́ ìwọlé rẹ
});

// Béèrè ìbéèrè, kí ó sì dáhùn ní Yorùbá
const { text } = await natlas.ask("Kí ni àwọn àmì ibà?", { language: "yo" });
console.log(text);

// Túmọ̀ láti Gẹ̀ẹ́sì sí Yorùbá
const t = await natlas.translate({ text: "Wash your hands before eating.", from: "en", to: "yo" });
console.log(t.text);
```

Pa kọ́kọ́rọ́ ìwọlé (token) rẹ mọ́ sórí sáfà rẹ. Má ṣe fi í sínú kóòdù tí ó ń ṣiṣẹ́ nínú aṣàwákiri (browser).

## Ojú-òpó ìdánwò (Playground)

```bash
cp .env.example .env.local   # kọ àdírẹ́sì àti kọ́kọ́rọ́ rẹ síbẹ̀
npm install
npm run playground           # ṣí http://localhost:3000
```

Lórí ojú-òpó yìí, o lè bá N-ATLAS sọ̀rọ̀, túmọ̀ ọ̀rọ̀, kí o sì ṣàkópọ̀ ọ̀rọ̀ ní èdè mẹ́rẹ̀ẹ̀rin. Kóòdù SDK tí ó bá ìbéèrè rẹ mu yóò hàn lẹ́gbẹ̀ẹ́ rẹ̀, kí o lè dà á kọ.

## Bí a ṣe ń gbé N-ATLAS kalẹ̀

N-ATLAS kò tíì ní API ti gbogbo ènìyàn, nítorí náà o nílò olùpín tirẹ̀ lórí GPU. Ọ̀nà tí ó yára jùlọ ni Hugging Face Inference Endpoint. Wo [DEPLOY_NATLAS.md](DEPLOY_NATLAS.md) fún ìgbésẹ̀ kọ̀ọ̀kan.

## Ìwé àṣẹ

`natlas-js` wà lábẹ́ ìwé àṣẹ MIT. N-ATLAS fúnra rẹ̀ ní ìwé àṣẹ tirẹ̀ láti ọwọ́ NCAIR àti Awarri Technologies: ó jẹ́ ọ̀fẹ́ fún ohun èlò tí kò ju 1,000 olùlò lọ lóṣù, ó sì gbọ́dọ̀ dárúkọ N-ATLAS. Ka [ìwé àṣẹ àwòṣe náà](https://huggingface.co/NCAIR1/N-ATLaS) kí o tó ṣe ìfilọ́lẹ̀.

Guru Innovation Hub, Calabar, Nàìjíríà ló kọ́ ọ.
