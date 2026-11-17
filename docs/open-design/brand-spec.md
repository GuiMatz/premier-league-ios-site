# Premier League IOS — especificação visual

Sistema editorial-esportivo claro, com momentos navy de alto impacto, azul elétrico para ação e dourado restrito a conquistas e personalização.

```css
:root {
  --bg: oklch(0.975 0.008 250);
  --surface: oklch(0.995 0.003 250);
  --fg: oklch(0.205 0.055 258);
  --muted: oklch(0.50 0.025 255);
  --border: oklch(0.89 0.018 252);
  --accent: oklch(0.54 0.23 258);
}
```

- Display: `"Barlow Condensed", "Arial Narrow", sans-serif`
- Corpo: `"Manrope", "Segoe UI", sans-serif`
- Mono: `"IBM Plex Mono", Consolas, monospace`

## Regras observadas

1. Branco-gelo domina; navy aparece em hero, header e momentos de competição.
2. Azul royal é reservado a ações e estados selecionados; dourado identifica campeão, recorde, primeiro lugar ou favorito.
3. Manchetes condensadas e em caixa alta criam linguagem de transmissão esportiva; texto de interface permanece sóbrio e legível.
4. Cards têm volume por sombra e separação tonal, sem glassmorphism ou bordas luminosas.
5. Formas azuis desfocadas dão profundidade ao fundo; grafismos de campo aparecem apenas como textura secundária.
