#import "ConnectViewController.h"
#import "AppDelegate.h"
#import "Networking/APIClient.h"
#import "Models/ConnectionConfig.h"

// -----------------------------------------------------------------------------
#pragma mark - Constants
// -----------------------------------------------------------------------------

static const CGFloat kPadding = 24;

@interface ConnectViewController ()

@property (strong) NSTextField *titleLabel;
@property (strong) NSTextField *subtitleLabel;

@property (strong) NSTextField *serverLabel;
@property (strong) NSTextField *serverField;
@property (strong) NSTextField *apiKeyLabel;
@property (strong) NSTextField *apiKeyField;

@property (strong) NSButton *connectButton;
@property (strong) NSProgressIndicator *spinner;
@property (strong) NSTextField *statusLabel;

@property (strong) NSView *cardView;

@end

@implementation ConnectViewController

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

    // 如果已有配置，回填
    if ([ConnectionConfig hasConfig]) {
        ConnectionConfig *config = [ConnectionConfig loadConfig];
        self.serverField.stringValue = config.serverURL;
        self.apiKeyField.stringValue = config.apiKey;
    }
}

// -----------------------------------------------------------------------------
#pragma mark - UI Setup
// -----------------------------------------------------------------------------

- (void)setupUI {
    // ---- Card View ----
    self.cardView = [[NSView alloc] init];
    self.cardView.wantsLayer = YES;
    self.cardView.layer.backgroundColor = [NSColor controlBackgroundColor].CGColor;
    self.cardView.layer.cornerRadius = 12;
    self.cardView.layer.borderWidth = 0.5;
    self.cardView.layer.borderColor = [[NSColor separatorColor] CGColor];
    self.cardView.layer.shadowColor = [[NSColor colorWithWhite:0 alpha:0.1] CGColor];
    self.cardView.layer.shadowOffset = CGSizeMake(0, 2);
    self.cardView.layer.shadowRadius = 8;
    self.cardView.layer.shadowOpacity = 1;
    [self.view addSubview:self.cardView];

    // ---- Title ----
    self.titleLabel = [self createLabelWithFontSize:22 weight:NSFontWeightBold
                                              color:[NSColor labelColor]
                                              text:@"连接到 LingoLin 服务器"];
    [self.cardView addSubview:self.titleLabel];

    // ---- Subtitle ----
    self.subtitleLabel = [self createLabelWithFontSize:13 weight:NSFontWeightRegular
                                                 color:[NSColor secondaryLabelColor]
                                                 text:@"输入服务器地址和 API Key 开始浏览文件"];
    [self.cardView addSubview:self.subtitleLabel];

    // ---- Server URL ----
    self.serverLabel = [self createLabelWithFontSize:12 weight:NSFontWeightSemibold
                                               color:[NSColor labelColor]
                                               text:@"服务器地址"];
    [self.cardView addSubview:self.serverLabel];

    self.serverField = [[NSTextField alloc] init];
    self.serverField.placeholderString = @"例如: http://192.168.1.100:8080";
    self.serverField.font = [NSFont systemFontOfSize:14];
    self.serverField.controlSize = NSControlSizeRegular;
    self.serverField.bezelStyle = NSTextFieldRoundedBezel;
    self.serverField.focusRingType = NSFocusRingTypeDefault;
    self.serverField.stringValue = @"";
    [self.cardView addSubview:self.serverField];

    // ---- API Key ----
    self.apiKeyLabel = [self createLabelWithFontSize:12 weight:NSFontWeightSemibold
                                               color:[NSColor labelColor]
                                               text:@"API Key"];
    [self.cardView addSubview:self.apiKeyLabel];

    self.apiKeyField = [[NSTextField alloc] init];
    self.apiKeyField.placeholderString = @"输入 API Key";
    self.apiKeyField.font = [NSFont systemFontOfSize:14];
    self.apiKeyField.controlSize = NSControlSizeRegular;
    self.apiKeyField.bezelStyle = NSTextFieldRoundedBezel;
    [self.cardView addSubview:self.apiKeyField];

    // ---- Connect Button ----
    self.connectButton = [[NSButton alloc] init];
    self.connectButton.title = @"连接";
    self.connectButton.bezelStyle = NSBezelStyleRounded;
    self.connectButton.font = [NSFont systemFontOfSize:14 weight:NSFontWeightSemibold];
    self.connectButton.target = self;
    self.connectButton.action = @selector(connectTapped:);
    self.connectButton.keyEquivalent = @"\r";
    [self.cardView addSubview:self.connectButton];

    // ---- Spinner ----
    self.spinner = [[NSProgressIndicator alloc] init];
    self.spinner.style = NSProgressIndicatorStyleSpinning;
    self.spinner.controlSize = NSControlSizeSmall;
    self.spinner.hidden = YES;
    [self.cardView addSubview:self.spinner];

    // ---- Status ----
    self.statusLabel = [self createLabelWithFontSize:12 weight:NSFontWeightRegular
                                               color:[NSColor secondaryLabelColor]
                                               text:@""];
    self.statusLabel.alignment = NSTextAlignmentCenter;
    self.statusLabel.hidden = YES;
    [self.cardView addSubview:self.statusLabel];
}

- (NSTextField *)createLabelWithFontSize:(CGFloat)size weight:(NSFontWeight)weight
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
    label.lineBreakMode = NSLineBreakByWordWrapping;
    return label;
}

// -----------------------------------------------------------------------------
#pragma mark - Layout
// -----------------------------------------------------------------------------

- (void)setupLayout {
    self.cardView.translatesAutoresizingMaskIntoConstraints = NO;
    self.titleLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.subtitleLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.serverLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.serverField.translatesAutoresizingMaskIntoConstraints = NO;
    self.apiKeyLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.apiKeyField.translatesAutoresizingMaskIntoConstraints = NO;
    self.connectButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.spinner.translatesAutoresizingMaskIntoConstraints = NO;
    self.statusLabel.translatesAutoresizingMaskIntoConstraints = NO;

    NSView *view = self.view;
    NSView *card = self.cardView;

    // Card constraints
    [card.centerXAnchor constraintEqualToAnchor:view.centerXAnchor].active = YES;
    [card.centerYAnchor constraintEqualToAnchor:view.centerYAnchor].active = YES;
    [card.widthAnchor constraintEqualToConstant:420].active = YES;

    // Title
    [self.titleLabel.topAnchor constraintEqualToAnchor:card.topAnchor constant:kPadding].active = YES;
    [self.titleLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.titleLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    // Subtitle
    [self.subtitleLabel.topAnchor constraintEqualToAnchor:self.titleLabel.bottomAnchor constant:6].active = YES;
    [self.subtitleLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.subtitleLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    // Server label
    [self.serverLabel.topAnchor constraintEqualToAnchor:self.subtitleLabel.bottomAnchor constant:24].active = YES;
    [self.serverLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.serverLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    // Server field
    [self.serverField.topAnchor constraintEqualToAnchor:self.serverLabel.bottomAnchor constant:6].active = YES;
    [self.serverField.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.serverField.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    // API Key label
    [self.apiKeyLabel.topAnchor constraintEqualToAnchor:self.serverField.bottomAnchor constant:16].active = YES;
    [self.apiKeyLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.apiKeyLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    // API Key field
    [self.apiKeyField.topAnchor constraintEqualToAnchor:self.apiKeyLabel.bottomAnchor constant:6].active = YES;
    [self.apiKeyField.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.apiKeyField.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;

    // Connect button
    [self.connectButton.topAnchor constraintEqualToAnchor:self.apiKeyField.bottomAnchor constant:24].active = YES;
    [self.connectButton.centerXAnchor constraintEqualToAnchor:card.centerXAnchor].active = YES;
    [self.connectButton.widthAnchor constraintEqualToConstant:160].active = YES;
    [self.connectButton.heightAnchor constraintEqualToConstant:36].active = YES;

    // Spinner
    [self.spinner.centerXAnchor constraintEqualToAnchor:card.centerXAnchor].active = YES;
    [self.spinner.centerYAnchor constraintEqualToAnchor:self.connectButton.centerYAnchor].active = YES;

    // Status
    [self.statusLabel.topAnchor constraintEqualToAnchor:self.connectButton.bottomAnchor constant:12].active = YES;
    [self.statusLabel.leadingAnchor constraintEqualToAnchor:card.leadingAnchor constant:kPadding].active = YES;
    [self.statusLabel.trailingAnchor constraintEqualToAnchor:card.trailingAnchor constant:-kPadding].active = YES;
    [self.statusLabel.bottomAnchor constraintLessThanOrEqualToAnchor:card.bottomAnchor constant:-kPadding].active = YES;

    // Card bottom (auto height)
    [card.bottomAnchor constraintEqualToAnchor:self.statusLabel.bottomAnchor constant:kPadding].active = YES;
}

// -----------------------------------------------------------------------------
#pragma mark - Actions
// -----------------------------------------------------------------------------

- (void)connectTapped:(id)sender {
    NSString *serverURL = [self.serverField.stringValue stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
    NSString *apiKey    = [self.apiKeyField.stringValue stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];

    // 验证
    if (serverURL.length == 0) {
        [self showStatus:@"请输入服务器地址" isError:YES];
        return;
    }
    if (apiKey.length == 0) {
        [self showStatus:@"请输入 API Key" isError:YES];
        return;
    }

    // 去除末尾斜杠
    if ([serverURL hasSuffix:@"/"]) {
        serverURL = [serverURL substringToIndex:serverURL.length - 1];
    }

    [self setLoading:YES];
    [self showStatus:@"" isError:NO];

    // 更新 APIClient 配置
    [[APIClient shared] updateConfigWithBaseURL:serverURL apiKey:apiKey];

    // 测试连接
    [[APIClient shared] testConnection:^(BOOL success, NSString *errorMsg) {
        [self setLoading:NO];
        if (success) {
            // 保存配置
            ConnectionConfig *config = [[ConnectionConfig alloc] init];
            config.serverURL = serverURL;
            config.apiKey = apiKey;
            [config save];

            [self showStatus:@"✅ 连接成功！" isError:NO];

            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                [self.appDelegate switchToFileBrowser];
            });
        } else {
            [self showStatus:[NSString stringWithFormat:@"❌ 连接失败: %@", errorMsg] isError:YES];
        }
    }];
}

// -----------------------------------------------------------------------------
#pragma mark - UI Helpers
// -----------------------------------------------------------------------------

- (void)setLoading:(BOOL)loading {
    self.spinner.hidden = !loading;
    self.connectButton.hidden = loading;
    if (loading) {
        [self.spinner startAnimation:nil];
    } else {
        [self.spinner stopAnimation:nil];
    }
}

- (void)showStatus:(NSString *)text isError:(BOOL)isError {
    if (text.length == 0) {
        self.statusLabel.hidden = YES;
        return;
    }
    self.statusLabel.hidden = NO;
    self.statusLabel.stringValue = text;
    self.statusLabel.textColor = isError ? [NSColor systemRedColor] : [NSColor systemGreenColor];
}

@end
