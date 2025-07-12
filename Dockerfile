FROM public.ecr.aws/lambda/nodejs:18

# Install Chromium dependencies
RUN yum install -y \
    atk cups-libs gtk3 libXcomposite libXcursor \
    libXdamage libXext libXi libXtst alsa-lib \
    ipa-gothic-fonts xorg-x11-fonts-Type1 xorg-x11-utils \
    xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic xorg-x11-fonts-misc \
    xorg-x11-fonts-base libdrm mesa-libgbm \
    && yum clean all

# Copy and install packages
COPY . .
RUN npm install

CMD [ "index.handler" ]
