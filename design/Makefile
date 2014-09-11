#!/bin/sh

FULL_SIZE := logo_1024.png
SIZES := 256 64 48
LOGOS := $(addsuffix .png,$(addprefix logo_,${SIZES}))

all: ${FULL_SIZE} ${LOGOS} dendry.ico

${FULL_SIZE}:
	convert -background none logo.svg ${FULL_SIZE}

logo_%.png: ${FULL_SIZE}
	convert ${FULL_SIZE} -thumbnail $*x$* logo_$*.png

dendry.ico:
	convert ${FULL_SIZE} -thumbnail 256x256 dendry.ico
