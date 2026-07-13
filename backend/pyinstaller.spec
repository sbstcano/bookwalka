# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, copy_metadata

block_cipher = None

# Collect all data files for dependencies
datas = []
datas += collect_data_files('manga_ocr')
datas += collect_data_files('transformers')
datas += collect_data_files('tqdm')
# BertJapaneseTokenizer uses MeCab through fugashi.  unidic_lite's actual
# dictionary (~260 MB) is package data, so PyInstaller will not discover it by
# following Python imports alone.  Without it, transformers hides MeCab's
# OSError behind the misleading "Unable to load vocabulary" error.
datas += collect_data_files('unidic_lite')

for pkg in ['transformers', 'tqdm', 'torch', 'regex', 'filelock', 'packaging', 'numpy', 'tokenizers', 'sentencepiece', 'huggingface_hub', 'manga_ocr', 'unidic_lite']:
    try:
        datas += copy_metadata(pkg)
    except Exception as e:
        print(f"Warning: Could not copy metadata for {pkg}: {e}")

# Collect hidden imports (especially for uvicorn plugins and dynamically loaded modules)
hiddenimports = [
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets.websockets_impl',
    'uvicorn.protocols.websockets.wsproto_impl',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.loops.uvloop',
    'fastapi',
    'manga_ocr',
    'unidic_lite',
    'numpy',
    'PIL',
]
hiddenimports += collect_submodules('manga_ocr')
hiddenimports += collect_submodules('transformers')
hiddenimports += collect_submodules('app')

a = Analysis(
    ['app/main.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='bookwalka-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='bookwalka-backend',
)
