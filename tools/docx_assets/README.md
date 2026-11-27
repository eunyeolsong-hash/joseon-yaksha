# 캐릭터 애셋 추출 (조선야차_캐릭터_애셋_모음_완성본.docx → github-deploy/)

macOS 전용 (Vision 프레임워크로 배경 제거). 필요: `pip install pillow numpy scipy pyobjc-framework-Vision pyobjc-framework-Quartz`

```
mkdir work && cd work
unzip ../조선야차_캐릭터_애셋_모음_완성본.docx -d docx
python ../tools/docx_assets/walk.py  docx/word/media walk    # 걷기 시트 → 프레임 (김선달·최호철·이동민)
python ../tools/docx_assets/walk2.py docx/word/media walk    # 겹치는 시트는 라벨 위치 기준 (심청이·해님·달님)
python ../tools/docx_assets/walk3.py docx/word/media walk    # 해님 보정
python ../tools/docx_assets/poses.py docx/word/media poses   # 동작 5종 + 전신 누끼
python ../tools/docx_assets/export.py . ../github-deploy     # 크기 정규화 → <key>_p1..5.png, <key>_walk_0..8.png, <key>.png, sprite_meta.js
```

문서 이미지 번호(image1 … image22)와 자르는 위치는 각 스크립트 상단에 하드코딩되어 있음 — 문서가 바뀌면 다시 맞춰야 함.
게임 쪽 배율: `assets.js`의 `DOC_POSES`(동작 5종), `ANIMS`(걷기 사이클).
