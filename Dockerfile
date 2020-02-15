FROM ubuntu:latest

# Get the TLS CA certificates, they're not provided by busybox.
RUN apt-get update && apt-get install -y ca-certificates \
  bash \
  wget \
  && mkdir /target \
  && cd /target \
  && wget https://github.com/textileio/textile/releases/download/v0.0.2/textile_v0.0.2_linux-amd64.tar.gz \
  && tar -xvf textile_v0.0.2_linux-amd64.tar.gz

# Now comes the actual target image, which aims to be as small as possible.
FROM busybox:1.31.0-glibc
LABEL maintainer="Textile <contact@textile.io>"

# Get the textile binary, entrypoint script, and TLS CAs from the build container.
ENV SRC_DIR /textile
COPY --from=0 /target/textile /usr/local/bin/textile
COPY --from=0 /etc/ssl/certs /etc/ssl/certs

COPY . /home/repo
# COPY entrypoint.sh /entrypoint.sh

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/home/repo/entrypoint.sh"]
