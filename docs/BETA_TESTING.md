# Beta testing natlas-js

Thank you for testing. It takes about 20 minutes.

## What to do

1. Open the playground link you were sent. Try at least one request in each mode (Chat, Translate, Summarise) and at least two languages.
2. Copy the code shown under **Same call with natlas-js** into a small Node script and run it against the endpoint details you were given:

   ```bash
   mkdir natlas-test && cd natlas-test && npm init -y
   npm install github:GuruInnovationHubDevs/natlas-sdk
   ```

   ```js
   // test.mjs
   import { NAtlas } from "natlas-js";
   const natlas = new NAtlas({ baseURL: process.env.NATLAS_BASE_URL, apiKey: process.env.NATLAS_API_KEY });
   const { text } = await natlas.ask("Ẹ káàárọ̀! Kí ni oúnjẹ tó dára fún ọmọdé?", { language: "yo" });
   console.log(text);
   ```

   ```bash
   NATLAS_BASE_URL=... NATLAS_API_KEY=... node test.mjs
   ```

3. Fill in the **Beta tester feedback** form at the bottom of the playground.

## What we want to know

- Did the install and first call work first time?
- Were the docs clear enough to use without help?
- How good were the answers in each language you tried?
- What would you need before using this in a real project?

Your feedback is stored with the hub and summarised (without contact details) as validation evidence for the National AI Innovation Challenge.
