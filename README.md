## Pcms

This is patient nurse chating app

#### License

mit# pcms

pip install vosk soundfile librosa

pip install pydub

#text to speech
pip install gtts

#extract symptoms from text
pip install transformers>=4.30
pip install torch>=2.0

for spelling correction
pip install language-tool-python

sudo apt install ffmpeg 
# Or install ffmpeg for your OS

OFFICIAL SITE
https://alphacephei.com/vosk/models

wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
mv vosk-model-small-en-us-0.15 model
AFTER EXPERIMENTS USED MODE OF SIZE 1.8GB




#IF THERE IS ISSUE INSTALLING ffmpeg THEN USE THIS

sudo apt install build-essential git
git clone https://git.ffmpeg.org/ffmpeg.git
cd ffmpeg
./configure --prefix=/usr/local
make -j$(nproc)
sudo make install

#then
./configure --prefix=/usr/local --enable-gpl --enable-nonfree
make -j$(nproc)
sudo make install# pcms
