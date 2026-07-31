APP_NAME = LingoLinOC
BUILD_DIR = build
PROJECT = $(APP_NAME).xcodeproj
SCHEME = $(APP_NAME)

.PHONY: all clean run xcodeproj

all: xcodeproj build

xcodeproj: $(PROJECT)

$(PROJECT): project.yml LingoLinOC/**/*.m LingoLinOC/**/*.h LingoLinOC/Info.plist
	xcodegen generate

build: $(PROJECT)
	xcodebuild -project $(PROJECT) -scheme $(SCHEME) -configuration Release \
		DSTROOT=$(BUILD_DIR) \
		CONFIGURATION_BUILD_DIR=$(BUILD_DIR)/Release \
		clean build

run: build
	open $(BUILD_DIR)/Release/$(APP_NAME).app

clean:
	rm -rf $(BUILD_DIR)
	rm -rf $(PROJECT)
