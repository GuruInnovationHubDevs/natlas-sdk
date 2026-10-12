# Live integration test: natlas-js against N-ATLAS

- Date: 12 October 2026, 19:38 WAT
- Model: NCAIR1/N-ATLaS, 4-bit GGUF build (Q4_K_M), served by llama.cpp (build 11574) on a 2-core CPU allocation
- Command: `node examples/quickstart.mjs` (SDK health check, Hausa and Igbo answers, English→Yoruba translation, English summary, Yoruba streaming)

```
Endpoint health: { ok: true, latencyMs: 9789 }

=== ask (Hausa) (17046 ms) ===
Alamomin farko na malaria sun haɗa da zazzabi, sanyi, jin jini a cikin fitsari, ciwon kai, da kuma jin rashin lafiya ko gajiya.

=== ask (Igbo) (94048 ms) ===
Iji chekwaa ego gị nke ọma, tụlee usoro ndị a:

1. **Budgeting**: Mepụta mmefu ego ma soro ya. Nke a na-enyere gị aka ịma ego ole ị na-emefu ma chọpụta ebe a ga-emezi.

2. **Ego nchekwa**: Malite nchekwa. Ọbụlagodi obere ego a na-echekwa kwa izu nwere ike ịba uru n'oge na-adịghị anya.

3. **Zere ụgwọ**: Jiri ego ole a chọrọ naanị. Zere ịgbazinye ego ma zere ịzụrụ ihe ndị na-adịghị mkpa.

4. **Zụta n'ọnụ ahịa**: Chọọ ahịa na mbelata ọnụahịa, ma zụta ihe ndị a na-ere.

5. **Nweta ego**: Chọọ ụzọ isi nweta ego ọzọ, dị ka itinye ego ma ọ bụ ịmepụta ihe na-ere.

6. **Nyochaa na melite**: Nyochaa mmefu ego gị mgbe niile ma mee mgbanwe dịka ọ dị mkpa.

Site n'itinye usoro ndị a, ị nwere ike chekwaa ego gị nke ọma.

=== translate en → yo (14647 ms) ===
Wẹ ọwọ́ rẹ pẹ̀lú sọpọ̀ kí o tó jẹun.

=== summarize (English) (21096 ms) ===
N-ATLAS is a language model that helps understand and generate English, Hausa, Igbo, and Yoruba languages, created by NCAIR and Awarri in 2025.

Streaming (Yoruba): Kí gbogbo ènìyàn yìí máa bá a lọ, kí ẹ ṣọ́ra!

Built with N-ATLAS (NCAIR, Awarri Technologies)
```
