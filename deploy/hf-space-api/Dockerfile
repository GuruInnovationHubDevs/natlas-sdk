# N-ATLAS inference API on a free Hugging Face CPU Space (2 vCPU, 16 GB RAM).
# Serves an OpenAI-compatible /v1/chat/completions using llama.cpp and a 4-bit build of NCAIR1/N-ATLaS.
# Set the Space secret LLAMA_API_KEY to require a bearer token.
FROM ghcr.io/ggml-org/llama.cpp:server

ENV LLAMA_CACHE=/tmp/llama-cache \
    LLAMA_ARG_HOST=0.0.0.0 \
    LLAMA_ARG_PORT=7860 \
    LLAMA_ARG_CTX_SIZE=4096 \
    LLAMA_ARG_THREADS=2 \
    LLAMA_ARG_N_PARALLEL=2

EXPOSE 7860
CMD ["-hf", "tosinamuda/N-ATLaS-GGUF:Q4_K_M", "--jinja"]
