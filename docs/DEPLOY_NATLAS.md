# Running N-ATLAS on an endpoint

N-ATLAS (`NCAIR1/N-ATLaS`, 8 billion parameters) needs a GPU. These steps give you an OpenAI-compatible endpoint that `natlas-js` can call.

## Option A: Hugging Face Inference Endpoint (quickest)

1. Sign in at [huggingface.co](https://huggingface.co), open [NCAIR1/N-ATLaS](https://huggingface.co/NCAIR1/N-ATLaS) and accept the licence terms.
2. Click **Deploy → Inference Endpoints**.
3. Choose a single **NVIDIA L4 (24 GB)** or **A10G** GPU. The default container (Text Generation Inference) is fine.
4. Set security to **Protected** (requires your token).
5. Create the endpoint and wait until its status is **Running** (usually 5–15 minutes).
6. Copy the endpoint URL and create a [Hugging Face access token](https://huggingface.co/settings/tokens) with *Inference Endpoints* permission.
7. Put both in `.env.local`:

   ```
   NATLAS_BASE_URL=https://xxxxxxxx.us-east-1.aws.endpoints.huggingface.cloud
   NATLAS_API_KEY=hf_xxxxxxxxxxxxxxxx
   ```

8. Check it: `npm run example`.

Cost is billed per hour while the endpoint runs. Enable **scale to zero** when you're not demoing; the SDK retries the "model loading" 503 while it wakes up.

## Option B: vLLM on your own GPU server

```bash
pip install vllm
huggingface-cli login            # account that accepted the N-ATLAS terms
vllm serve NCAIR1/N-ATLaS --max-model-len 8192 --api-key "$NATLAS_API_KEY"
```

Then set `NATLAS_BASE_URL=http://<server>:8000`.

## Licence reminder

N-ATLAS is free for products with up to 1,000 monthly active users; larger deployments need a commercial licence from the rights holders. Show the attribution `Built with N-ATLAS (NCAIR, Awarri Technologies)` in your product.
