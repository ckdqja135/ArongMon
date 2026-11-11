# 포켓몬 그림 넣기

폴더 이름이 포켓몬 종류(키)이고, 안에 PNG를 넣으면 게임이 그 그림을 그대로 씁니다.
파일이 없으면 게임에 내장된 그림을 씁니다.

| 파일 | 쓰이는 곳 | 권장 크기 |
| --- | --- | --- |
| `front.png` (필수) | 배틀, 도감, 상태 화면, 진화 연출. 아롱이는 내 쪽 배틀에서도 이 그림을 그대로 씀 | 80×80 |
| `icon.png` (선택) | 파티 화면 아이콘, 필드에서 걸어다니는 모습 | 32×32 |

- 크기가 달라도 칸에 맞게 자동으로 줄여서 바닥 가운데에 맞춥니다.
- 배경이 투명하지 않으면 네 귀퉁이와 같은 색 배경을 자동으로 지웁니다.
- `icon.png`가 없으면 `front.png`를 줄여서 씁니다.

아롱이 폴더:

- `arong/` 애기였을 때 (Lv.5~)
- `arong2/` 성장하고 있을 때 (Lv.18~)
- `arong3/` 다 성장했을 때 (Lv.32~)

## 큰 이미지 변환하기

AI로 만든 큰 픽셀아트(한 도트가 수십 px)는 그대로 줄이면 흐려지므로, 변환 스크립트를 쓰면 깔끔하게 들어갑니다.
배경을 지우고, 도트 칸을 찾아 다시 찍습니다. 원본은 `art-src/`에 보관합니다.

```
npm run import-sprite -- art-src/arong/1-baby.png src/assets/mon/arong/front.png --height 44 --scale 1
npm run import-sprite -- art-src/arong/1-baby.png src/assets/mon/arong/icon.png --height 26 --scale 1
```

현재 아롱이 높이: 애기 44px, 성장기 58px, 다 큼 70px (아이콘은 26~31px).
