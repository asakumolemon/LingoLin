#import "FileBrowserViewController.h"
#import "AppDelegate.h"
#import "ViewControllers/SettingsViewController.h"
#import "Networking/APIClient.h"
#import "Models/FileItem.h"

// -----------------------------------------------------------------------------
#pragma mark - Table View Cell
// -----------------------------------------------------------------------------

@interface FileCellView : NSTableCellView

@property (strong) NSTextField *sizeField;
@property (strong) NSTextField *dateField;

- (void)configureWithItem:(FileItem *)item;

@end

@implementation FileCellView

- (void)configureWithItem:(FileItem *)item {
    self.textField.stringValue = item.name;

    // Icon
    if (item.isDirectory) {
        self.imageView.image = [NSImage imageWithSystemSymbolName:@"folder.fill"
                                         accessibilityDescription:@"文件夹"];
        self.imageView.contentTintColor = [NSColor systemBlueColor];
    } else {
        NSString *sym = @"doc.fill";
        NSString *ext = item.path.pathExtension.lowercaseString;
        if ([@[@"jpg",@"jpeg",@"png",@"gif",@"webp",@"bmp"] containsObject:ext]) sym = @"photo.fill";
        else if ([@[@"pdf"] containsObject:ext]) sym = @"doc.richtext.fill";
        else if ([@[@"zip",@"rar",@"7z",@"tar",@"gz"] containsObject:ext]) sym = @"archivebox.fill";
        else if ([@[@"mp4",@"mov",@"avi",@"mkv"] containsObject:ext]) sym = @"video.fill";
        else if ([@[@"mp3",@"wav",@"aac",@"flac"] containsObject:ext]) sym = @"music.note";
        else if ([@[@"txt",@"md",@"json",@"js",@"html",@"css",@"xml",@"yaml",@"yml"] containsObject:ext]) sym = @"doc.text.fill";
        self.imageView.image = [NSImage imageWithSystemSymbolName:sym accessibilityDescription:ext];
        self.imageView.contentTintColor = [NSColor tertiaryLabelColor];
    }

    self.sizeField.stringValue = item.formattedSize;
    self.dateField.stringValue = item.formattedUpdatedAt;
}

@end

// -----------------------------------------------------------------------------
#pragma mark - Main VC
// -----------------------------------------------------------------------------

@interface FileBrowserViewController () <NSTableViewDataSource, NSTableViewDelegate, NSMenuDelegate>

@property (strong) NSArray<FileItem *> *items;
@property (copy) NSString *currentPath;

// Toolbar
@property (nonatomic, strong) NSView *toolbarView;
@property (strong) NSButton *backButton;
@property (strong) NSButton *forwardButton;
@property (strong) NSTextField *pathLabel;
@property (strong) NSButton *refreshButton;
@property (strong) NSButton *uploadButton;
@property (strong) NSButton *createFolderBtn;
@property (strong) NSButton *settingsButton;
@property (strong) NSWindow *settingsWindow;

// File list
@property (strong) NSTableView *tableView;
@property (strong) NSScrollView *scrollView;
@property (strong) NSTableColumn *nameColumn;
@property (strong) NSTableColumn *sizeColumn;
@property (strong) NSTableColumn *dateColumn;

// Status bar
@property (strong) NSTextField *statusLabel;
@property (strong) NSProgressIndicator *spinner;

// Navigation stack
@property (strong) NSMutableArray<NSString *> *backStack;
@property (strong) NSMutableArray<NSString *> *forwardStack;

// Preview
@property (strong) NSView *previewPanel;
@property (strong) NSImageView *previewImageView;
@property (strong) NSTextView *previewTextView;

@end

@implementation FileBrowserViewController

// -----------------------------------------------------------------------------
#pragma mark - Lifecycle
// -----------------------------------------------------------------------------

- (void)loadView {
    self.view = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 900, 600)];
    self.view.wantsLayer = YES;
}

- (void)viewDidLoad {
    [super viewDidLoad];

    self.currentPath = @"/";
    self.backStack = [NSMutableArray array];
    self.forwardStack = [NSMutableArray array];
    self.items = @[];

    [self setupToolbar];
    [self setupTableView];
    [self setupStatusBar];
    [self setupLayout];
}

- (void)viewDidAppear {
    [super viewDidAppear];
    [self refresh];
}

// -----------------------------------------------------------------------------
#pragma mark - Toolbar
// -----------------------------------------------------------------------------

- (void)setupToolbar {
    NSView *toolbar = [[NSView alloc] init];
    toolbar.wantsLayer = YES;
    toolbar.layer.backgroundColor = [NSColor controlBackgroundColor].CGColor;
    toolbar.layer.borderWidth = 0.5;
    toolbar.layer.borderColor = [[NSColor separatorColor] CGColor];
    [self.view addSubview:toolbar];
    self.toolbarView = toolbar;

    // Back
    self.backButton = [NSButton buttonWithImage:[NSImage imageWithSystemSymbolName:@"chevron.left" accessibilityDescription:@"后退"]
                                         target:self action:@selector(goBack:)];
    self.backButton.bezelStyle = NSBezelStyleRounded;
    self.backButton.controlSize = NSControlSizeSmall;
    self.backButton.enabled = NO;
    [toolbar addSubview:self.backButton];

    // Forward
    self.forwardButton = [NSButton buttonWithImage:[NSImage imageWithSystemSymbolName:@"chevron.right" accessibilityDescription:@"前进"]
                                            target:self action:@selector(goForward:)];
    self.forwardButton.bezelStyle = NSBezelStyleRounded;
    self.forwardButton.controlSize = NSControlSizeSmall;
    self.forwardButton.enabled = NO;
    [toolbar addSubview:self.forwardButton];

    // Path label
    self.pathLabel = [[NSTextField alloc] init];
    self.pathLabel.stringValue = @"/";
    self.pathLabel.font = [NSFont systemFontOfSize:13 weight:NSFontWeightMedium];
    self.pathLabel.textColor = [NSColor labelColor];
    self.pathLabel.bezeled = NO;
    self.pathLabel.editable = NO;
    self.pathLabel.drawsBackground = NO;
    self.pathLabel.lineBreakMode = NSLineBreakByTruncatingHead;
    self.pathLabel.backgroundColor = [NSColor clearColor];
    [toolbar addSubview:self.pathLabel];

    // Refresh
    // Refresh
    self.refreshButton = [NSButton buttonWithImage:[NSImage imageWithSystemSymbolName:@"arrow.clockwise" accessibilityDescription:@"刷新"]
                                            target:self action:@selector(refresh)];
    self.refreshButton.bezelStyle = NSBezelStyleRounded;
    self.refreshButton.controlSize = NSControlSizeSmall;
    self.refreshButton.toolTip = @"刷新";
    [toolbar addSubview:self.refreshButton];

    // Upload
    self.uploadButton = [NSButton buttonWithImage:[NSImage imageWithSystemSymbolName:@"icloud.and.arrow.up" accessibilityDescription:@"上传"]
                                           target:self action:@selector(uploadTapped:)];
    self.uploadButton.bezelStyle = NSBezelStyleRounded;
    self.uploadButton.controlSize = NSControlSizeSmall;
    self.uploadButton.toolTip = @"上传文件";
    [toolbar addSubview:self.uploadButton];

    // New folder
    self.createFolderBtn = [NSButton buttonWithImage:[NSImage imageWithSystemSymbolName:@"folder.badge.plus" accessibilityDescription:@"新建文件夹"]
                                              target:self action:@selector(newFolderTapped:)];
    self.createFolderBtn.bezelStyle = NSBezelStyleRounded;
    self.createFolderBtn.controlSize = NSControlSizeSmall;
    self.createFolderBtn.toolTip = @"新建文件夹";
    [toolbar addSubview:self.createFolderBtn];

    // Settings
    self.settingsButton = [NSButton buttonWithImage:[NSImage imageWithSystemSymbolName:@"gearshape" accessibilityDescription:@"设置"]
                                              target:self action:@selector(settingsTapped:)];
    self.settingsButton.bezelStyle = NSBezelStyleRounded;
    self.settingsButton.controlSize = NSControlSizeSmall;
    self.settingsButton.toolTip = @"连接设置";
    [toolbar addSubview:self.settingsButton];
    self.toolbarView = toolbar;

    // Store reference
}

- (NSView *)toolbarView {
    return _toolbarView;
}

// -----------------------------------------------------------------------------
#pragma mark - Table View
// -----------------------------------------------------------------------------

- (void)setupTableView {
    self.scrollView = [[NSScrollView alloc] init];
    self.scrollView.hasVerticalScroller = YES;
    self.scrollView.borderType = NSNoBorder;
    self.scrollView.autohidesScrollers = YES;
    [self.view addSubview:self.scrollView];

    self.tableView = [[NSTableView alloc] init];
    self.tableView.delegate = self;
    self.tableView.dataSource = self;
    self.tableView.selectionHighlightStyle = NSTableViewSelectionHighlightStyleRegular;
    self.tableView.rowHeight = 44;
    self.tableView.intercellSpacing = NSMakeSize(0, 1);
    self.tableView.backgroundColor = [NSColor controlBackgroundColor];
    self.tableView.floatsGroupRows = NO;
    self.tableView.target = self;
    self.tableView.doubleAction = @selector(doubleClickRow:);

    // Columns
    self.nameColumn = [[NSTableColumn alloc] initWithIdentifier:@"name"];
    self.nameColumn.title = @"名称";
    self.nameColumn.width = 320;
    self.nameColumn.minWidth = 120;
    self.nameColumn.resizingMask = NSTableColumnAutoresizingMask;
    [self.tableView addTableColumn:self.nameColumn];

    self.sizeColumn = [[NSTableColumn alloc] initWithIdentifier:@"size"];
    self.sizeColumn.title = @"大小";
    self.sizeColumn.width = 100;
    self.sizeColumn.minWidth = 60;
    self.sizeColumn.maxWidth = 150;
    self.sizeColumn.headerCell.alignment = NSTextAlignmentCenter;
    [self.tableView addTableColumn:self.sizeColumn];

    self.dateColumn = [[NSTableColumn alloc] initWithIdentifier:@"date"];
    self.dateColumn.title = @"修改日期";
    self.dateColumn.width = 180;
    self.dateColumn.minWidth = 100;
    self.dateColumn.headerCell.alignment = NSTextAlignmentCenter;
    [self.tableView addTableColumn:self.dateColumn];

    // Icon column is handled in viewForTableColumn
    // No data cell needed for view-based table

    self.scrollView.documentView = self.tableView;

    // Context menu
    NSMenu *menu = [[NSMenu alloc] init];
    menu.delegate = self;
    NSMenuItem *downloadItem = [[NSMenuItem alloc] initWithTitle:@"下载" action:@selector(downloadSelected:) keyEquivalent:@""];
    NSMenuItem *deleteItem = [[NSMenuItem alloc] initWithTitle:@"删除" action:@selector(deleteSelected:) keyEquivalent:@""];
    [menu addItem:downloadItem];
    [menu addItem:deleteItem];
    self.tableView.menu = menu;
}

// -----------------------------------------------------------------------------
#pragma mark - Status Bar
// -----------------------------------------------------------------------------

- (void)setupStatusBar {
    self.statusLabel = [[NSTextField alloc] init];
    self.statusLabel.stringValue = @"";
    self.statusLabel.font = [NSFont systemFontOfSize:11];
    self.statusLabel.textColor = [NSColor secondaryLabelColor];
    self.statusLabel.bezeled = NO;
    self.statusLabel.editable = NO;
    self.statusLabel.drawsBackground = NO;
    self.statusLabel.backgroundColor = [NSColor clearColor];
    [self.view addSubview:self.statusLabel];

    self.spinner = [[NSProgressIndicator alloc] init];
    self.spinner.style = NSProgressIndicatorStyleSpinning;
    self.spinner.controlSize = NSControlSizeSmall;
    self.spinner.hidden = YES;
    [self.view addSubview:self.spinner];
}

// -----------------------------------------------------------------------------
#pragma mark - Layout
// -----------------------------------------------------------------------------

- (void)setupLayout {
    NSView *toolbar = [self toolbarView];

    toolbar.translatesAutoresizingMaskIntoConstraints = NO;
    self.backButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.forwardButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.pathLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.refreshButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.uploadButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.createFolderBtn.translatesAutoresizingMaskIntoConstraints = NO;
    self.settingsButton.translatesAutoresizingMaskIntoConstraints = NO;
    self.scrollView.translatesAutoresizingMaskIntoConstraints = NO;
    self.statusLabel.translatesAutoresizingMaskIntoConstraints = NO;
    self.spinner.translatesAutoresizingMaskIntoConstraints = NO;

    NSView *view = self.view;

    // Toolbar
    [toolbar.topAnchor constraintEqualToAnchor:view.topAnchor].active = YES;
    [toolbar.leadingAnchor constraintEqualToAnchor:view.leadingAnchor].active = YES;
    [toolbar.trailingAnchor constraintEqualToAnchor:view.trailingAnchor].active = YES;
    [toolbar.heightAnchor constraintEqualToConstant:44].active = YES;

    // Back button
    [self.backButton.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.backButton.leadingAnchor constraintEqualToAnchor:toolbar.leadingAnchor constant:8].active = YES;
    [self.backButton.widthAnchor constraintEqualToConstant:30].active = YES;
    [self.backButton.heightAnchor constraintEqualToConstant:30].active = YES;

    // Forward button
    [self.forwardButton.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.forwardButton.leadingAnchor constraintEqualToAnchor:self.backButton.trailingAnchor constant:4].active = YES;
    [self.forwardButton.widthAnchor constraintEqualToConstant:30].active = YES;
    [self.forwardButton.heightAnchor constraintEqualToConstant:30].active = YES;

    // Path label
    [self.pathLabel.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.pathLabel.leadingAnchor constraintEqualToAnchor:self.forwardButton.trailingAnchor constant:12].active = YES;
    [self.pathLabel.trailingAnchor constraintEqualToAnchor:self.refreshButton.leadingAnchor constant:-8].active = YES;

    // Refresh button
    [self.refreshButton.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.refreshButton.trailingAnchor constraintEqualToAnchor:self.uploadButton.leadingAnchor constant:-4].active = YES;
    [self.refreshButton.widthAnchor constraintEqualToConstant:30].active = YES;
    [self.refreshButton.heightAnchor constraintEqualToConstant:30].active = YES;

    // Upload button
    [self.uploadButton.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.uploadButton.trailingAnchor constraintEqualToAnchor:self.createFolderBtn.leadingAnchor constant:-4].active = YES;
    [self.uploadButton.widthAnchor constraintEqualToConstant:30].active = YES;
    [self.uploadButton.heightAnchor constraintEqualToConstant:30].active = YES;

    // New folder button
    [self.createFolderBtn.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.createFolderBtn.trailingAnchor constraintEqualToAnchor:self.settingsButton.leadingAnchor constant:-4].active = YES;
    [self.createFolderBtn.widthAnchor constraintEqualToConstant:30].active = YES;
    [self.createFolderBtn.heightAnchor constraintEqualToConstant:30].active = YES;

    // Settings button
    [self.settingsButton.centerYAnchor constraintEqualToAnchor:toolbar.centerYAnchor].active = YES;
    [self.settingsButton.trailingAnchor constraintEqualToAnchor:toolbar.trailingAnchor constant:-8].active = YES;
    [self.settingsButton.widthAnchor constraintEqualToConstant:30].active = YES;
    [self.settingsButton.heightAnchor constraintEqualToConstant:30].active = YES;

    // Table view
    [self.scrollView.topAnchor constraintEqualToAnchor:toolbar.bottomAnchor].active = YES;
    [self.scrollView.leadingAnchor constraintEqualToAnchor:view.leadingAnchor].active = YES;
    [self.scrollView.trailingAnchor constraintEqualToAnchor:view.trailingAnchor].active = YES;
    [self.scrollView.bottomAnchor constraintEqualToAnchor:self.statusLabel.topAnchor].active = YES;

    // Status
    [self.statusLabel.leadingAnchor constraintEqualToAnchor:view.leadingAnchor constant:12].active = YES;
    [self.statusLabel.trailingAnchor constraintEqualToAnchor:self.spinner.leadingAnchor constant:-8].active = YES;
    [self.statusLabel.bottomAnchor constraintEqualToAnchor:view.bottomAnchor constant:-4].active = YES;
    [self.statusLabel.heightAnchor constraintEqualToConstant:20].active = YES;

    // Spinner
    [self.spinner.centerYAnchor constraintEqualToAnchor:self.statusLabel.centerYAnchor].active = YES;
    [self.spinner.trailingAnchor constraintEqualToAnchor:view.trailingAnchor constant:-12].active = YES;
}

// -----------------------------------------------------------------------------
#pragma mark - Data Loading
// -----------------------------------------------------------------------------

- (void)refresh {
    if (![[APIClient shared] isConfigured]) {
        [self.appDelegate switchToConnect];
        return;
    }

    [self setLoading:YES];
    self.statusLabel.stringValue = [NSString stringWithFormat:@"正在加载 %@...", self.currentPath];

    [[APIClient shared] listFilesAtPath:self.currentPath completion:^(ApiResponse *response, NSError *error) {
        [self setLoading:NO];
        if (error) {
            self.statusLabel.stringValue = [NSString stringWithFormat:@"❌ %@", error.localizedDescription];
            return;
        }
        self.items = [response parseFileList];
        [self.tableView reloadData];
        self.pathLabel.stringValue = self.currentPath;
        self.statusLabel.stringValue = [NSString stringWithFormat:@"%lu 个项目", (unsigned long)self.items.count];

        // Update nav buttons
        self.backButton.enabled = self.backStack.count > 0;
        self.forwardButton.enabled = self.forwardStack.count > 0;
    }];
}

- (void)setLoading:(BOOL)loading {
    self.spinner.hidden = !loading;
    if (loading) {
        [self.spinner startAnimation:nil];
    } else {
        [self.spinner stopAnimation:nil];
    }
}

// -----------------------------------------------------------------------------
#pragma mark - Navigation
// -----------------------------------------------------------------------------

- (void)settingsTapped:(id)sender {
    if (self.settingsWindow) {
        [self.settingsWindow makeKeyAndOrderFront:nil];
        return;
    }

    SettingsViewController *settingsVC = [[SettingsViewController alloc] init];
    settingsVC.appDelegate = self.appDelegate;

    NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(0, 0, 600, 420)
                                                   styleMask:NSWindowStyleMaskTitled | NSWindowStyleMaskClosable
                                                     backing:NSBackingStoreBuffered
                                                       defer:NO];
    window.title = @"连接设置";
    window.contentViewController = settingsVC;
    window.minSize = NSMakeSize(520, 380);
    window.releasedWhenClosed = NO;
    self.settingsWindow = window;

    [self.view.window beginSheet:window completionHandler:^(NSModalResponse response) {
        self.settingsWindow = nil;
        [self refresh];
    }];
}

- (void)navigateToPath:(NSString *)path {
    [self.backStack addObject:self.currentPath];
    [self.forwardStack removeAllObjects];
    self.currentPath = path;
    [self refresh];
}

- (void)goBack:(id)sender {
    if (self.backStack.count == 0) return;
    [self.forwardStack addObject:self.currentPath];
    self.currentPath = self.backStack.lastObject;
    [self.backStack removeLastObject];
    [self refresh];
}

- (void)goForward:(id)sender {
    if (self.forwardStack.count == 0) return;
    [self.backStack addObject:self.currentPath];
    self.currentPath = self.forwardStack.lastObject;
    [self.forwardStack removeLastObject];
    [self refresh];
}

// -----------------------------------------------------------------------------
#pragma mark - NSTableViewDataSource
// -----------------------------------------------------------------------------

- (NSInteger)numberOfRowsInTableView:(NSTableView *)tableView {
    return self.items.count;
}

- (NSView *)tableView:(NSTableView *)tableView viewForTableColumn:(NSTableColumn *)tableColumn row:(NSInteger)row {
    if (row >= (NSInteger)self.items.count) return nil;
    FileItem *item = self.items[row];

    // Use custom cell view for name/size/date
    FileCellView *cellView = [tableView makeViewWithIdentifier:@"FileCell" owner:nil];
    if (!cellView) {
        cellView = [[FileCellView alloc] init];
        cellView.identifier = @"FileCell";

        // Image view
        NSImageView *imgView = [[NSImageView alloc] init];
        imgView.translatesAutoresizingMaskIntoConstraints = NO;
        cellView.imageView = imgView;
        [cellView addSubview:imgView];

        // Text field (name)
        NSTextField *nameField = [[NSTextField alloc] init];
        nameField.font = [NSFont systemFontOfSize:13];
        nameField.textColor = [NSColor labelColor];
        nameField.bezeled = NO;
        nameField.editable = NO;
        nameField.drawsBackground = NO;
        nameField.lineBreakMode = NSLineBreakByTruncatingTail;
        nameField.translatesAutoresizingMaskIntoConstraints = NO;
        cellView.textField = nameField;
        [cellView addSubview:nameField];

        // Size field
        cellView.sizeField = [[NSTextField alloc] init];
        cellView.sizeField.font = [NSFont systemFontOfSize:12];
        cellView.sizeField.textColor = [NSColor secondaryLabelColor];
        cellView.sizeField.bezeled = NO;
        cellView.sizeField.editable = NO;
        cellView.sizeField.drawsBackground = NO;
        cellView.sizeField.alignment = NSTextAlignmentCenter;
        cellView.sizeField.lineBreakMode = NSLineBreakByTruncatingTail;
        cellView.sizeField.translatesAutoresizingMaskIntoConstraints = NO;
        [cellView addSubview:cellView.sizeField];

        // Date field
        cellView.dateField = [[NSTextField alloc] init];
        cellView.dateField.font = [NSFont systemFontOfSize:12];
        cellView.dateField.textColor = [NSColor secondaryLabelColor];
        cellView.dateField.bezeled = NO;
        cellView.dateField.editable = NO;
        cellView.dateField.drawsBackground = NO;
        cellView.dateField.alignment = NSTextAlignmentCenter;
        cellView.dateField.lineBreakMode = NSLineBreakByTruncatingTail;
        cellView.dateField.translatesAutoresizingMaskIntoConstraints = NO;
        [cellView addSubview:cellView.dateField];

        // Layout within cell
        [cellView.imageView.leadingAnchor constraintEqualToAnchor:cellView.leadingAnchor constant:4].active = YES;
        [cellView.imageView.centerYAnchor constraintEqualToAnchor:cellView.centerYAnchor].active = YES;
        [cellView.imageView.widthAnchor constraintEqualToConstant:28].active = YES;
        [cellView.imageView.heightAnchor constraintEqualToConstant:28].active = YES;

        [cellView.textField.leadingAnchor constraintEqualToAnchor:cellView.imageView.trailingAnchor constant:8].active = YES;
        [cellView.textField.centerYAnchor constraintEqualToAnchor:cellView.centerYAnchor].active = YES;
        [cellView.textField.trailingAnchor constraintEqualToAnchor:cellView.trailingAnchor constant:-4].active = YES;

        [cellView.sizeField.leadingAnchor constraintEqualToAnchor:cellView.leadingAnchor constant:4].active = YES;
        [cellView.sizeField.trailingAnchor constraintEqualToAnchor:cellView.trailingAnchor constant:-4].active = YES;
        [cellView.sizeField.centerYAnchor constraintEqualToAnchor:cellView.centerYAnchor].active = YES;

        [cellView.dateField.leadingAnchor constraintEqualToAnchor:cellView.leadingAnchor constant:4].active = YES;
        [cellView.dateField.trailingAnchor constraintEqualToAnchor:cellView.trailingAnchor constant:-4].active = YES;
        [cellView.dateField.centerYAnchor constraintEqualToAnchor:cellView.centerYAnchor].active = YES;
    }

    [cellView configureWithItem:item];
    BOOL isName = [tableColumn.identifier isEqualToString:@"name"];
    BOOL isSize = [tableColumn.identifier isEqualToString:@"size"];
    BOOL isDate = [tableColumn.identifier isEqualToString:@"date"];
    cellView.imageView.hidden = !isName;
    cellView.textField.hidden = !isName;
    cellView.sizeField.hidden = !isSize;
    cellView.dateField.hidden = !isDate;
    return cellView;
}

// -----------------------------------------------------------------------------
#pragma mark - NSTableViewDelegate
// -----------------------------------------------------------------------------

- (void)doubleClickRow:(id)sender {
    NSInteger row = self.tableView.clickedRow;
    if (row < 0 || row >= (NSInteger)self.items.count) return;

    FileItem *item = self.items[row];
    if (item.isDirectory) {
        [self navigateToPath:item.path];
    } else {
        [self previewFile:item];
    }
}

// -----------------------------------------------------------------------------
#pragma mark - File Operations
// -----------------------------------------------------------------------------

- (void)uploadTapped:(id)sender {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = YES;
    panel.message = @"选择要上传的文件";

    [panel beginSheetModalForWindow:self.view.window completionHandler:^(NSModalResponse response) {
        if (response != NSModalResponseOK) return;

        [self setLoading:YES];
        __block NSInteger remaining = panel.URLs.count;
        __block NSInteger successCount = 0;
        __block NSString *lastError = nil;

        for (NSURL *fileURL in panel.URLs) {
            NSString *destPath = [self.currentPath stringByAppendingPathComponent:fileURL.lastPathComponent];
            [[APIClient shared] uploadFileAtURL:fileURL toPath:destPath completion:^(ApiResponse *response, NSError *error) {
                remaining--;
                if (error) {
                    lastError = error.localizedDescription;
                } else {
                    successCount++;
                }
                if (remaining == 0) {
                    [self setLoading:NO];
                    if (successCount > 0) {
                        self.statusLabel.stringValue = [NSString stringWithFormat:@"✅ 成功上传 %ld 个文件", (long)successCount];
                    } else {
                        self.statusLabel.stringValue = [NSString stringWithFormat:@"❌ %@", lastError ?: @"上传失败"];
                    }
                    [self refresh];
                }
            }];
        }
    }];
}

- (void)newFolderTapped:(id)sender {
    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"新建文件夹";
    alert.informativeText = @"输入文件夹名称：";
    [alert addButtonWithTitle:@"创建"];
    [alert addButtonWithTitle:@"取消"];

    NSTextField *input = [[NSTextField alloc] initWithFrame:NSMakeRect(0, 0, 260, 24)];
    input.placeholderString = @"文件夹名称";
    alert.accessoryView = input;

    [alert beginSheetModalForWindow:self.view.window completionHandler:^(NSModalResponse returnCode) {
        if (returnCode != NSAlertFirstButtonReturn) return;
        NSString *name = [input.stringValue stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
        if (name.length == 0) return;

        NSString *newPath = [self.currentPath stringByAppendingPathComponent:name];
        [self setLoading:YES];
        [[APIClient shared] createDirectoryAtPath:newPath completion:^(ApiResponse *response, NSError *error) {
            [self setLoading:NO];
            if (error) {
                self.statusLabel.stringValue = [NSString stringWithFormat:@"❌ %@", error.localizedDescription];
            } else {
                self.statusLabel.stringValue = @"✅ 文件夹已创建";
                [self refresh];
            }
        }];
    }];
}

- (void)downloadSelected:(id)sender {
    NSInteger row = self.tableView.clickedRow;
    if (row < 0) {
        // Use selected row
        row = self.tableView.selectedRow;
    }
    if (row < 0 || row >= (NSInteger)self.items.count) return;

    FileItem *item = self.items[row];
    if (item.isDirectory) {
        self.statusLabel.stringValue = @"⚠️ 暂不支持下载整个文件夹";
        return;
    }

    NSSavePanel *panel = [NSSavePanel savePanel];
    panel.nameFieldStringValue = item.name;
    panel.message = @"选择保存位置";

    [panel beginSheetModalForWindow:self.view.window completionHandler:^(NSModalResponse response) {
        if (response != NSModalResponseOK) return;

        [self setLoading:YES];
        self.statusLabel.stringValue = [NSString stringWithFormat:@"下载中: %@...", item.name];

        [[APIClient shared] downloadFileAtPath:item.path toURL:panel.URL completion:^(NSURL *fileURL, NSError *error) {
            [self setLoading:NO];
            if (error) {
                self.statusLabel.stringValue = [NSString stringWithFormat:@"❌ 下载失败: %@", error.localizedDescription];
            } else {
                self.statusLabel.stringValue = [NSString stringWithFormat:@"✅ 已下载: %@", item.name];
            }
        }];
    }];
}

- (void)deleteSelected:(id)sender {
    NSInteger row = self.tableView.clickedRow;
    if (row < 0) row = self.tableView.selectedRow;
    if (row < 0 || row >= (NSInteger)self.items.count) return;

    FileItem *item = self.items[row];

    NSAlert *alert = [[NSAlert alloc] init];
    alert.messageText = @"确认删除";
    alert.informativeText = [NSString stringWithFormat:@"确定要删除「%@」吗？%@",
                             item.name, item.isDirectory ? @"目录及其内容将被永久删除。" : @"此操作不可撤销。"];
    [alert addButtonWithTitle:@"删除"];
    [alert addButtonWithTitle:@"取消"];
    alert.alertStyle = NSAlertStyleWarning;

    [alert beginSheetModalForWindow:self.view.window completionHandler:^(NSModalResponse returnCode) {
        if (returnCode != NSAlertFirstButtonReturn) return;

        [self setLoading:YES];
        [[APIClient shared] removeItemAtPath:item.path completion:^(ApiResponse *response, NSError *error) {
            [self setLoading:NO];
            if (error) {
                self.statusLabel.stringValue = [NSString stringWithFormat:@"❌ 删除失败: %@", error.localizedDescription];
            } else {
                self.statusLabel.stringValue = [NSString stringWithFormat:@"已删除: %@", item.name];
                [self refresh];
            }
        }];
    }];
}

// -----------------------------------------------------------------------------
#pragma mark - Preview
// -----------------------------------------------------------------------------

- (void)previewFile:(FileItem *)item {
    NSString *ext = item.path.pathExtension.lowercaseString;
    BOOL isImage = [@[@"jpg", @"jpeg", @"png", @"gif", @"webp", @"bmp", @"svg"] containsObject:ext];
    BOOL isText  = [@[@"txt", @"md", @"json", @"js", @"html", @"css", @"xml", @"yaml", @"yml",
                       @"py", @"go", @"java", @"c", @"h", @"m", @"mm", @"swift", @"rb",
                       @"sh", @"conf", @"cfg", @"ini", @"log", @"csv"] containsObject:ext];

    if (!isImage && !isText) {
        self.statusLabel.stringValue = [NSString stringWithFormat:@"⚠️ 不支持预览 %@ 格式", ext];
        return;
    }

    [self setLoading:YES];
    self.statusLabel.stringValue = [NSString stringWithFormat:@"加载预览: %@...", item.name];

    [[APIClient shared] previewFileAtPath:item.path completion:^(NSData *data, NSString *mimeType, NSError *error) {
        [self setLoading:NO];
        if (error) {
            self.statusLabel.stringValue = [NSString stringWithFormat:@"❌ %@", error.localizedDescription];
            return;
        }

        if (isImage) {
            [self showImagePreview:data item:item];
        } else {
            [self showTextPreview:data item:item];
        }
    }];
}

- (void)showImagePreview:(NSData *)data item:(FileItem *)item {
    NSWindow *previewWindow = [NSWindow windowWithContentViewController:[[NSViewController alloc] init]];
    previewWindow.title = item.name;
    previewWindow.styleMask = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable;
    previewWindow.minSize = NSMakeSize(300, 300);

    NSRect frame = NSMakeRect(0, 0, 800, 600);
    [previewWindow setFrame:frame display:YES];
    [previewWindow center];

    NSImageView *imageView = [[NSImageView alloc] initWithFrame:previewWindow.contentView.bounds];
    imageView.image = [[NSImage alloc] initWithData:data];
    imageView.imageScaling = NSImageScaleProportionallyUpOrDown;
    imageView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;

    // Check if it's a GIF and animate
    if ([item.path.pathExtension.lowercaseString isEqualToString:@"gif"]) {
        imageView.animates = YES;
    }

    previewWindow.contentView = imageView;
    [previewWindow makeKeyAndOrderFront:nil];
}

- (void)showTextPreview:(NSData *)data item:(FileItem *)item {
    NSWindow *previewWindow = [NSWindow windowWithContentViewController:[[NSViewController alloc] init]];
    previewWindow.title = item.name;
    previewWindow.styleMask = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskResizable;
    previewWindow.minSize = NSMakeSize(400, 300);

    NSRect frame = NSMakeRect(0, 0, 700, 500);
    [previewWindow setFrame:frame display:YES];
    [previewWindow center];

    NSScrollView *scrollView = [[NSScrollView alloc] initWithFrame:previewWindow.contentView.bounds];
    scrollView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    scrollView.hasVerticalScroller = YES;
    scrollView.borderType = NSNoBorder;

    NSTextView *textView = [[NSTextView alloc] init];
    textView.editable = NO;
    textView.font = [NSFont fontWithName:@"SF Mono" size:13] ?: [NSFont systemFontOfSize:13];
    textView.textColor = [NSColor labelColor];
    textView.backgroundColor = [NSColor textBackgroundColor];

    NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!text) {
        // Try other encodings
        text = [[NSString alloc] initWithData:data encoding:NSUTF16StringEncoding];
    }
    if (!text) {
        text = @"⚠️ 无法解码文件内容（编码格式不支持）";
    }
    textView.string = text;

    scrollView.documentView = textView;
    previewWindow.contentView = scrollView;
    [previewWindow makeKeyAndOrderFront:nil];
}

// -----------------------------------------------------------------------------
#pragma mark - Context Menu Delegate
// -----------------------------------------------------------------------------

- (void)menuWillOpen:(NSMenu *)menu {
    NSInteger row = self.tableView.clickedRow;
    if (row >= 0) {
        [self.tableView selectRowIndexes:[NSIndexSet indexSetWithIndex:row] byExtendingSelection:NO];
    }
}

@end
