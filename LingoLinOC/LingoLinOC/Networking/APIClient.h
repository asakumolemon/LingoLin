#import <Foundation/Foundation.h>
#import "Models/ApiResponse.h"

NS_ASSUME_NONNULL_BEGIN

/// HTTP 方法
typedef NS_ENUM(NSInteger, HTTPMethod) {
    HTTPMethodGET,
    HTTPMethodPOST,
    HTTPMethodDELETE
};

/// 请求完成回调
typedef void(^APICallback)(ApiResponse * _Nullable response, NSError * _Nullable error);
/// 下载完成回调
typedef void(^DownloadCallback)(NSURL * _Nullable fileURL, NSError * _Nullable error);
/// 数据回调（用于预览/下载原始数据）
typedef void(^DataCallback)(NSData * _Nullable data, NSString * _Nullable mimeType, NSError * _Nullable error);

@interface APIClient : NSObject

/// 单例
+ (instancetype)shared;

/// 当前服务器地址
@property (copy, readonly) NSString *baseURL;
/// 当前 API Key
@property (copy, readonly) NSString *apiKey;

/// 更新连接配置
- (void)updateConfigWithBaseURL:(NSString *)baseURL apiKey:(NSString *)apiKey;
/// 是否有有效配置
- (BOOL)isConfigured;

// -----------------------------------------------------------------------------
#pragma mark - 文件操作 API
// -----------------------------------------------------------------------------

/// 获取文件列表
- (void)listFilesAtPath:(NSString *)path completion:(APICallback)completion;

/// 下载文件
- (void)downloadFileAtPath:(NSString *)path toURL:(NSURL *)destination completion:(DownloadCallback)completion;

/// 预览文件（图片/文本原始数据）
- (void)previewFileAtPath:(NSString *)path completion:(DataCallback)completion;

/// 上传文件
- (void)uploadFileAtURL:(NSURL *)fileURL toPath:(NSString *)destPath completion:(APICallback)completion;

/// 创建目录
- (void)createDirectoryAtPath:(NSString *)path completion:(APICallback)completion;

/// 删除文件或目录
- (void)removeItemAtPath:(NSString *)path completion:(APICallback)completion;

// -----------------------------------------------------------------------------
#pragma mark - 连接测试
// -----------------------------------------------------------------------------

/// 测试连接（获取根目录文件列表）
- (void)testConnection:(void(^)(BOOL success, NSString * _Nullable errorMsg))completion;

@end

NS_ASSUME_NONNULL_END
