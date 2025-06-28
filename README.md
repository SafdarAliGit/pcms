## Pcms

This is patient nurse chating app

#### License

mit# pcms
sudo apt install openjdk-17-jdk-headless
pip install vosk soundfile librosa
pip install pydub
pip install gtts
pip install language-tool-python

sudo apt install ffmpeg 

OFFICIAL SITE
https://alphacephei.com/vosk/models

wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
mv vosk-model-small-en-us-0.15 model


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
sudo make install



