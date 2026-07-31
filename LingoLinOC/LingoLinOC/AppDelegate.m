#import "AppDelegate.h"
#import "ViewControllers/ConnectViewController.h"
#import "ViewControllers/FileBrowserViewController.h"
#import "ViewControllers/SettingsViewController.h"
#import "Models/ConnectionConfig.h"

@interface AppDelegate ()

@property (strong) ConnectViewController *connectVC;
@property (strong) FileBrowserViewController *fileBrowserVC;
@property (strong) SettingsViewController *settingsVC;
@property (strong) NSViewController *currentVC;

@end

@implementation AppDelegate

// -----------------------------------------------------------------------------
#pragma mark - Application Lifecycle
// -----------------------------------------------------------------------------

- (void)applicationDidFinishLaunching:(NSNotification *)notification {

    [self setupWindow];

    [self setupMenuBar];

    if ([ConnectionConfig hasConfig]) {
        [self switchToFileBrowser];
    } else {
        [self switchToConnect];
    }

    [NSApp activateIgnoringOtherApps:YES];
    [self.window makeKeyAndOrderFront:nil];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

// -----------------------------------------------------------------------------
#pragma mark - Window Setup
// -----------------------------------------------------------------------------

- (void)setupWindow {
    NSRect frame = NSMakeRect(0, 0, 1000, 720);
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                             styleMask:NSWindowStyleMaskTitled
                                                      | NSWindowStyleMaskClosable
                                                      | NSWindowStyleMaskMiniaturizable
                                                      | NSWindowStyleMaskResizable
                                               backing:NSBackingStoreBuffered
                                                 defer:NO];
    self.window.title = @"LingoLinOC";
    self.window.titlebarAppearsTransparent = NO;
    [self.window center];
    self.window.minSize = NSMakeSize(720, 500);
    self.window.backgroundColor = [NSColor controlBackgroundColor];
}

// -----------------------------------------------------------------------------
#pragma mark - Menu Bar
// -----------------------------------------------------------------------------

- (void)setupMenuBar {
    NSMenu *mainMenu = [[NSMenu alloc] init];

    // ---- App Menu ----
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    NSMenu *appMenu = [[NSMenu alloc] init];

    NSMenuItem *aboutItem = [[NSMenuItem alloc] initWithTitle:@"关于 LingoLinOC"
                                                       action:@selector(orderFrontStandardAboutPanel:)
                                                keyEquivalent:@""];
    [appMenu addItem:aboutItem];
    [appMenu addItem:[NSMenuItem separatorItem]];

    NSMenuItem *settingsItem = [[NSMenuItem alloc] initWithTitle:@"设置..."
                                                          action:@selector(showSettings:)
                                                   keyEquivalent:@","];
    settingsItem.target = self;
    [appMenu addItem:settingsItem];
    [appMenu addItem:[NSMenuItem separatorItem]];

    NSMenuItem *quitItem = [[NSMenuItem alloc] initWithTitle:@"退出 LingoLinOC"
                                                       action:@selector(terminate:)
                                                keyEquivalent:@"q"];
    [appMenu addItem:quitItem];

    appMenuItem.submenu = appMenu;
    [mainMenu addItem:appMenuItem];

    // ---- File Menu ----
    NSMenuItem *fileMenuItem = [[NSMenuItem alloc] init];
    NSMenu *fileMenu = [[NSMenu alloc] initWithTitle:@"文件"];
    NSMenuItem *refreshItem = [[NSMenuItem alloc] initWithTitle:@"刷新"
                                                         action:@selector(refreshFiles:)
                                                  keyEquivalent:@"r"];
    refreshItem.target = self;
    [fileMenu addItem:refreshItem];
    fileMenuItem.submenu = fileMenu;
    [mainMenu addItem:fileMenuItem];

    // ---- Window Menu ----
    NSMenuItem *windowMenuItem = [[NSMenuItem alloc] init];
    NSMenu *windowMenu = [[NSMenu alloc] initWithTitle:@"窗口"];
    NSMenuItem *minimizeItem = [[NSMenuItem alloc] initWithTitle:@"最小化"
                                                          action:@selector(miniaturize:)
                                                   keyEquivalent:@"m"];
    [windowMenu addItem:minimizeItem];
    windowMenuItem.submenu = windowMenu;
    [mainMenu addItem:windowMenuItem];

    [NSApp setMainMenu:mainMenu];
}

// -----------------------------------------------------------------------------
#pragma mark - View Controller Switching
// -----------------------------------------------------------------------------

- (void)switchToConnect {
    if (!self.connectVC) {
        self.connectVC = [[ConnectViewController alloc] init];
        self.connectVC.appDelegate = self;
    }
    [self setContentViewController:self.connectVC];
    self.window.title = @"连接服务器 - LingoLinOC";
}

- (void)switchToFileBrowser {
    if (!self.fileBrowserVC) {
        self.fileBrowserVC = [[FileBrowserViewController alloc] init];
        self.fileBrowserVC.appDelegate = self;
    }
    [self setContentViewController:self.fileBrowserVC];
    self.window.title = @"LingoLinOC";
}

- (void)switchToSettings {
    if (!self.settingsVC) {
        self.settingsVC = [[SettingsViewController alloc] init];
        self.settingsVC.appDelegate = self;
    }
    [self setContentViewController:self.settingsVC];
    self.window.title = @"设置 - LingoLinOC";
}

- (void)setContentViewController:(NSViewController *)vc {
    if (self.currentVC) {
        [self.currentVC.view removeFromSuperview];
    }
    self.currentVC = vc;

    NSView *view = vc.view;
    view.frame = self.window.contentView.bounds;
    view.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    [self.window.contentView addSubview:view];
}

// -----------------------------------------------------------------------------
#pragma mark - Actions
// -----------------------------------------------------------------------------

- (void)showSettings:(id)sender {
    [self switchToSettings];
}

- (void)refreshFiles:(id)sender {
    if ([self.currentVC isKindOfClass:[FileBrowserViewController class]]) {
        [(FileBrowserViewController *)self.currentVC refresh];
    }
}

@end
