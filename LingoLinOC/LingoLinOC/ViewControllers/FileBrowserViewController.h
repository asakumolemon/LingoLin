#import <Cocoa/Cocoa.h>

@class AppDelegate;

@interface FileBrowserViewController : NSViewController

@property (weak) AppDelegate *appDelegate;

/// 刷新当前目录
- (void)refresh;

@end
