#import "ConnectionConfig.h"

static NSString *const kUDKeyServerURL = @"LingoLinServerURL";
static NSString *const kUDKeyApiKey   = @"LingoLinApiKey";

@implementation ConnectionConfig

+ (BOOL)hasConfig {
    NSUserDefaults *ud = [NSUserDefaults standardUserDefaults];
    NSString *url = [ud stringForKey:kUDKeyServerURL];
    NSString *key = [ud stringForKey:kUDKeyApiKey];
    return url.length > 0 && key.length > 0;
}

+ (instancetype)loadConfig {
    NSUserDefaults *ud = [NSUserDefaults standardUserDefaults];
    ConnectionConfig *config = [[ConnectionConfig alloc] init];
    config.serverURL = [ud stringForKey:kUDKeyServerURL];
    config.apiKey    = [ud stringForKey:kUDKeyApiKey];
    return config;
}

- (void)save {
    NSUserDefaults *ud = [NSUserDefaults standardUserDefaults];
    [ud setObject:self.serverURL forKey:kUDKeyServerURL];
    [ud setObject:self.apiKey forKey:kUDKeyApiKey];
    [ud synchronize];
}

+ (void)clear {
    NSUserDefaults *ud = [NSUserDefaults standardUserDefaults];
    [ud removeObjectForKey:kUDKeyServerURL];
    [ud removeObjectForKey:kUDKeyApiKey];
    [ud synchronize];
}

@end
