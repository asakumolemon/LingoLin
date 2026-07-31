#import <Cocoa/Cocoa.h>

@class ConnectViewController;
@class FileBrowserViewController;
@class SettingsViewController;

@interface AppDelegate : NSObject <NSApplicationDelegate>

@property (strong) NSWindow *window;

- (void)switchToConnect;
- (void)switchToFileBrowser;
- (void)switchToSettings;

@end
