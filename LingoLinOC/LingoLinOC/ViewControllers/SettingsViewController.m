#import "SettingsViewController.h"
#import "AppDelegate.h"
#import "Networking/APIClient.h"
#import "Models/ConnectionConfig.h"

static const CGFloat kPadding = 24;
static const CGFloat kButtonWidth = 104;
static const CGFloat kButtonHeight = 32;

@interface SettingsViewController ()

@property (strong) NSTextField *serverLabel;
@property (strong) NSTextField *serverField;
@property (strong) NSTextField *apiKeyLabel;
@property (strong) NSTextField *apiKeyField;

@property (strong) NSButton *saveButton;
@property (strong) NSButton *disconnectButton;
@property (strong) NSButton *closeButton;

@property (strong) NSTextField *titleLabel;
@property (strong) NSTextField *aboutLabel;

@property (strong) NSProgressIndicator *spinner;
@property (strong) NSTextField *statusLabel;
@property (strong) NSView *cardView;

@end

@implementation SettingsViewController

// -----------------------------------------------------------------------------
#pragma mark - Lifecycle
// -----------------------------------------------------------------------------

- (void)loadView {
    self.view = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 600, 500)];
    self.view.wantsLayer = YES;
    self.view.layer.backgroundColor = [NSColor windowBackgroundColor].CGColor;
}

- (void)viewDidLoad {
    [super viewDidLoad];
    [self setupUI];
    [self setupLayout];
    [self loadConfig];
}

- (void)viewWillAppear {
    [super viewWillAppear];
    [self loadConfig];
}

// -----------------------------------------------------------------------------
#pragma mark - UI
// -----------------------------------------------------------------------------

- (void)setupUI {
    // ---- Card View ----
    self.cardView = [[NSView alloc] init];
    self.cardView.wantsLayer = YES;
    self.cardView.layer.backgroundColor = [NSColor controlBackgroundColor].CGColor;
    self.cardView.layer.cornerRadius = 10;
    self.cardView.layer.borderWidth = 0.25;
    self.cardView.layer.borderColor = [[NSColor separatorColor] colorWithAlphaComponent:0.45].CGColor;
    [self.view addSubview:self.cardView];

    // Title
    self.titleLabel = [self labelWithSize:22 weight:NSFontWeightBold color:[NSColor labelColor] text:@"设置"];
    [self.cardView addSubview:self.titleLabel];

    // ---- Server URL ----
    self.serverLabel = [self labelWithSize:12 weight:NSFontWeightSemibold color:[NSColor labelColor] text:@"服务器地址"];
    [self.cardView addSubview:self.serverLabel];

    self.serverField = [[NSTextField alloc] init];
    self.serverField.font = [NSFont systemFontOfSize:14];
    self.serverField.controlSize = NSControlSizeRegular;
    self.serverField.bezelStyle = NSTextFieldRoundedBezel;
    self.serverField.placeholderString = @"http://192.168.1.100:8080";
    [self.cardView addSubview:self.serverField];

    // ---- API Key ----
    self.apiKeyLabel = [self labelWithSize:12 weight:NSFontWeightSemibold color:[NSColor labelColor] text:@"API Key"];
    [self.cardView addSubview:self.apiKeyLabel];

    self.apiKeyField = [[NSTextField alloc] init];
    self.apiKeyField.font = [NSFont systemFontOfSize:14];
    self.apiKeyField.controlSize = NSControlSizeRegular;
    self.apiKeyField.bezelStyle = NSTextFieldRoundedBezel;
    self.apiKeyField.placeholderString = @"输入 API Key";
    [self.cardView addSubview:self.apiKeyField];

    // ---- Save ----
    self.saveButton = [[NSButton alloc] init];
    self.saveButton.title = @"保存";
    self.saveButton.bezelStyle = NSBezelStyleRounded;
    self.saveButton.font = [NSFont systemFontOfSize:13 weight:NSFontWeightSemibold];
    self.saveButton.controlSize = NSControlSizeRegular;
    self.saveButton.target = self;
    self.saveButton.action = @selector(saveTapped:);
    [self.cardView addSubview:self.saveButton];

    // ---- Disconnect ----
    self.disconnectButton = [[NSButton alloc] init];
    self.disconnectButton.title = @"断开连接";
    self.disconnectButton.bezelStyle = NSBezelStyleRounded;
    self.disconnectButton.font = [NSFont systemFontOfSize:13];
    self.disconnectButton.controlSize = NSControlSizeRegular;
    self.disconnectButton.target = self;
    self.disconnectButton.action = @selector(disconnectTapped:);
    [self.cardView addSubview:self.disconnectButton];

    // ---- Close ----
    self.closeButton = [[NSButton alloc] init];
    self.closeButton.title = @"关闭";
    self.closeButton.bezelStyle = NSBezelStyleRounded;
    self.closeButton.font = [NSFont systemFontOfSize:13];
    self.closeButton.controlSize = NSControlSizeRegular;
    self.closeButton.target = self;
    self.closeButton.action = @selector(closeTapped:);
    [self.cardView addSubview:self.closeButton];

    // ---- Status ----
    self.statusLabel = [self labelWithSize:12 weight:NSFontWeightRegular color:[NSColor secondaryLabelColor] text:@""];
    self.statusLabel.alignment = NSTextAlignmentCenter;
    self.statusLabel.hidden = YES;
    [self.cardView addSubview:self.statusLabel];

    // ---- Spinner ----
    self.spinner = [[NSProgressIndicator alloc] init];
    self.spinner.style = NSProgressIndicatorStyleSpinning;
    self.spinner.controlSize = NSControlSizeSmall;
    self.spinner.hidden = YES;
    [self.cardView addSubview:self.spinner];

    // ---- About ----
    self.aboutLabel = [self labelWithSize:11 weight:NSFontWeightRegular color:[NSColor tertiaryLabelColor]
                                     text:@"LingoLinOC v1.0.0 — 原生 macOS 文件客户端"];
    self.aboutLabel.alignment = NSTextAlignmentCenter;
    [self.cardView addSubview:self.aboutLabel];
}

- (NSTextField *)labelWithSize:(CGFloat)size weight:(NSFontWeight)weight
                         color:(NSColor *)color text:(NSString *)text {
    NSTextField *label = [[NSTextField alloc] init];
    label.stringValue = text;
    label.font = [NSFont systemFontOfSize:size weight:weight];
    label.textColor = color;
    label.bezeled = NO;
    label.editable = NO;
    label.selectable = NO;
    label.drawsBackground = NO;
    label.backgroundColor = [NSColor clearColor];
    return label;
}

// -----------------------------------------------------------------------------
#pragma mark - Layout
// -----------------------------------------------------------------------------

- (void)setupLayout {
    self.cardView.translatesAutoresizingMaskIntoConstraints = NO;
    self.titleLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.serverLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.serverField.translatesAutoresizingMaskIntoConstraints = NO;
    self.apiKeyLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.apiKeyField.translatesAutoresizingMaskIntoConstraints = NO;
    self.saveButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.disconnectButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.closeButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.statusLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.spinner.translatesAutoresizingMaskIntoConstraints = NO;
    self.aboutLabel.translatesAutoresizingMaskIntoConstraints = NO;

    NSView *v = self.view;
    NSView *card = self.cardView;

    [card.centerXAnchor constraintEqualToAnchor:v.centerXAnchor].active = YES;
    [card.centerYAnchor constraintEqualToAnchor:v.centerYAnchor].active = YES;
    [card.widthAnchor constraintEqualToConstant:520].active = YES;

    [self.titleLabel.topAnchor constraintEqualToAnchor:card.topAnchor constant:24].active = YES;
    [self.titleLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.titleLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.serverLabel.topAnchor constraintEqualToAnchor:self.titleLabel.bottomAnchor constant:28].active = YES;
    [self.serverLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.serverLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.serverField.topAnchor constraintEqualToAnchor:self.serverLabel.bottomAnchor constant:6].active = YES;
    [self.serverField.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.serverField.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.apiKeyLabel.topAnchor constraintEqualToAnchor:self.serverField.bottomAnchor constant:16].active = YES;
    [self.apiKeyLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.apiKeyLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.apiKeyField.topAnchor constraintEqualToAnchor:self.apiKeyLabel.bottomAnchor constant:6].active = YES;
    [self.apiKeyField.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.apiKeyField.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.saveButton.topAnchor constraintEqualToAnchor:self.apiKeyField.bottomAnchor constant:24].active = YES;
    [self.saveButton.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.saveButton.widthAnchor constraintEqualToConstant:kButtonWidth].active = YES;
    [self.saveButton.heightAnchor constraintEqualToConstant:kButtonHeight].active = YES;

    [self.disconnectButton.centerYAnchor constraintEqualToAnchor:self.saveButton.centerYAnchor].active = YES;
    [self.disconnectButton.leadingAnchor constraintEqualToAnchor:self.saveButton.trailingAnchor constant:12].active = YES;
    [self.disconnectButton.widthAnchor constraintEqualToConstant:kButtonWidth].active = YES;
    [self.disconnectButton.heightAnchor constraintEqualToConstant:kButtonHeight].active = YES;

    [self.closeButton.centerYAnchor constraintEqualToAnchor:self.saveButton.centerYAnchor].active = YES;
    [self.closeButton.leadingAnchor constraintEqualToAnchor:self.disconnectButton.trailingAnchor constant:12].active = YES;
    [self.closeButton.widthAnchor constraintEqualToConstant:kButtonWidth].active = YES;
    [self.closeButton.heightAnchor constraintEqualToConstant:kButtonHeight].active = YES;

    [self.spinner.centerYAnchor constraintEqualToAnchor:self.saveButton.centerYAnchor].active = YES;
    [self.spinner.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.statusLabel.topAnchor constraintEqualToAnchor:self.saveButton.bottomAnchor constant:12].active = YES;
    [self.statusLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.statusLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    [self.aboutLabel.topAnchor constraintEqualToAnchor:self.statusLabel.bottomAnchor constant:16].active = YES;
    [self.aboutLabel.bottomAnchor constraintEqualToAnchor:card.bottomAnchor constant:-16].active = YES;
    [self.aboutLabel.centerXAnchor constraintEqualToAnchor:card.centerXAnchor].active = YES;
}

// -----------------------------------------------------------------------------
#pragma mark - Actions
// -----------------------------------------------------------------------------

- (void)loadConfig {
    if ([ConnectionConfig hasConfig]) {
        ConnectionConfig *config = [ConnectionConfig loadConfig];
        self.serverField.stringValue = config.serverURL;
        self.apiKeyField.stringValue = config.apiKey;
    }
}

- (void)saveTapped:(id)sender {
    NSString *serverURL = [self.serverField.stringValue stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    NSString *apiKey    = [self.apiKeyField.stringValue stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];

    if (serverURL.length == 0 || apiKey.length == 0) {
        [self showStatus:@"请填写完整信息" isError:YES];
        return;
    }

    if ([serverURL hasSuffix:@"/"]) {
        serverURL = [serverURL substringToIndex:serverURL.length - 1];
    }

    [self setLoading:YES];
    [[APIClient shared] updateConfigWithBaseURL:serverURL apiKey:apiKey];
    [[APIClient shared] testConnection:^(BOOL success, NSString *errorMsg) {
        [self setLoading:NO];
        if (success) {
            ConnectionConfig *config = [[ConnectionConfig alloc] init];
            config.serverURL = serverURL;
            config.apiKey = apiKey;
            [config save];

            [self showStatus:@"✅ 配置已保存并验证通过" isError:NO];
        } else {
            [self showStatus:[NSString stringWithFormat:@"❌ 连接失败: %@", errorMsg] isError:YES];
        }
    }];
}

- (void)closeTapped:(id)sender {
    NSWindow *window = self.view.window;
    if (window.sheetParent) {
        [window.sheetParent endSheet:window returnCode:NSModalResponseCancel];
    } else {
        [self.appDelegate switchToFileBrowser];
    }
}

- (void)disconnectTapped:(id)sender {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"断开连接";
    alert.informativeText = @"确定要断开连接吗？配置信息将被清除。";
    [alert addButtonWithTitle:@"断开"];
    [alert addButtonWithTitle:@"取消"];
    alert.alertStyle = NSAlertStyleWarning;

    [alert beginSheetModalForWindow:self.view.window completionHandler:^(NSModalResponse returnCode) {
        if (returnCode != NSAlertFirstButtonReturn) return;

        [ConnectionConfig clear];
        self.serverField.stringValue = @"";
        self.apiKeyField.stringValue = @"";
        [[APIClient shared] updateConfigWithBaseURL:@"" apiKey:@""];

        NSWindow *window = self.view.window;
        if (window.sheetParent) {
            [window.sheetParent endSheet:window returnCode:NSModalResponseOK];
        } else {
            [self.appDelegate switchToConnect];
        }
    }];
}

// -----------------------------------------------------------------------------
#pragma mark - Helpers
// -----------------------------------------------------------------------------

- (void)setLoading:(BOOL)loading {
    self.spinner.hidden = !loading;
    self.saveButton.hidden = loading;
    if (loading) {
        [self.spinner startAnimation:nil];
    } else {
        [self.spinner stopAnimation:nil];
    }
}

- (void)showStatus:(NSString *)text isError:(BOOL)isError {
    self.statusLabel.hidden = NO;
    self.statusLabel.stringValue = text;
    self.statusLabel.textColor = isError ? [NSColor systemRedColor] : [NSColor systemGreenColor];
}

@end
