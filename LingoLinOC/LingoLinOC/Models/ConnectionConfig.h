#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface ConnectionConfig : NSObject

/// 服务器地址，如 http://192.168.1.100:8080
@property (copy) NSString *serverURL;
/// API Key
@property (copy) NSString *apiKey;

/// 是否有已保存的配置
+ (BOOL)hasConfig;
/// 从 NSUserDefaults 加载配置
+ (instancetype)loadConfig;
/// 保存配置到 NSUserDefaults
- (void)save;
/// 清除配置
+ (void)clear;

@end

NS_ASSUME_NONNULL_END
