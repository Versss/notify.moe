# Makefile for Anime Notifier

# Constants
GOTEST=@./utils/test/go-test-color.sh
PACK=$(shell command -v pack 2> /dev/null)
RUN=$(shell command -v run 2> /dev/null)
SERVICEFILE=/etc/systemd/system/animenotifier.service

# Determine the name of the platform
OSNAME=

ifeq ($(OS),Windows_NT)
	OSNAME = WINDOWS
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Linux)
		OSNAME = LINUX
	endif
	ifeq ($(UNAME_S),Darwin)
		OSNAME = OSX
	endif
endif

# Build targets
server:
	@go build
deps:
	go mod download
jobs:
	@./jobs/build.sh
bots:
	@./bots/build.sh
patches:
	@./patches/build.sh
test:
	$(GOTEST) github.com/animenotifier/notify.moe -v -cover
bench:
	$(GOTEST) -bench .
pack:
	go install github.com/aerogo/pack/...
run:
	go install github.com/aerogo/run/...
tools:
ifeq ($(OSNAME),OSX)
	brew install coreutils
endif
	@make pack
	@make run
service:
	sudo cp systemd.service $(SERVICEFILE)
	sudo sed -i "s|MAKEFILE_USER|$(USER)|g" $(SERVICEFILE)
	sudo sed -i "s|MAKEFILE_PWD|$(PWD)|g" $(SERVICEFILE)
	sudo sed -i "s|MAKEFILE_EXEC|$(PWD)/notify.moe|g" $(SERVICEFILE)
	sudo systemctl daemon-reload
	@echo -e "\nYou can now start the service using:\n\nsudo systemctl start animenotifier.service"
assets:
	@tsc
	@pack
clean:
	find . -type f | xargs file | grep "ELF.*executable" | awk -F: '{print $1}' | xargs rm
	find . -type f | grep /scripts/ | grep .js | xargs rm
	rm -rf ./components
ports:
ifeq ($(OSNAME),LINUX)
	@sudo iptables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-port 4000
	@sudo iptables -t nat -A OUTPUT -o lo -p tcp --dport 443 -j REDIRECT --to-port 4001
	@sudo ip6tables -t nat -A OUTPUT -o lo -p tcp --dport 80 -j REDIRECT --to-port 4000
	@sudo ip6tables -t nat -A OUTPUT -o lo -p tcp --dport 443 -j REDIRECT --to-port 4001
endif
ifeq ($(OSNAME),OSX)
	@echo "rdr pass inet proto tcp from any to any port 443 -> 127.0.0.1 port 4001" | sudo pfctl -ef -
endif
all: tools assets server bots jobs patches

.PHONY: tools assets server bots jobs patches ports clean versions
