FROM golang:1.13.5-buster

# Get the TLS CA certificates, they're not provided by busybox.
RUN apt-get update && apt-get install -y ca-certificates \
  bash \
  wget \
  && mkdir /target \
  && cd /target \
  && wget https://github.com/textileio/textile/releases/download/v0.0.2/textile_v0.0.2_linux-amd64.tar.gz \
  && tar -xvf textile_v0.0.2_linux-amd64.tar.gz
#     && chmod +x textile \
#     && cp textile /usr/local/bin/

# Now comes the actual target image, which aims to be as small as possible.
FROM busybox:1.31.0-glibc
LABEL maintainer="Textile <contact@textile.io>"

# Get the textile binary, entrypoint script, and TLS CAs from the build container.
ENV SRC_DIR /textile
COPY --from=0 /target/textile /usr/local/bin/textile
COPY --from=0 /etc/ssl/certs /etc/ssl/certs

# Create the repo directory and switch to a non-privileged user.
# ENV TEXTILE_PATH /txtl
# RUN mkdir -p $TEXTILE_PATH \
#   && adduser -D -h $TEXTILE_PATH -u 1000 -G users textile \
#   && chown -R textile:users $TEXTILE_PATH \
#   && chown -R textile:users /github/home
# # Switch to a non-privileged user
# USER textile

# # Expose the repo as a volume.
# # Important this happens after the USER directive so permission are correct.
# VOLUME $TEXTILE_PATH

COPY / /home/repo
# COPY entrypoint.sh /entrypoint.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/home/repo/entrypoint.sh"]
