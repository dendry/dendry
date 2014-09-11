#!/bin/sh

convert -background none logo.svg logo_1024.png
convert logo_1024.png -thumbnail 256x256 logo_256.png
convert logo_1024.png -thumbnail 64x64 logo_64.png
convert logo_1024.png -thumbnail 48x48 logo_48.png
convert logo_1024.png -thumbnail 256x256 dendry.ico
