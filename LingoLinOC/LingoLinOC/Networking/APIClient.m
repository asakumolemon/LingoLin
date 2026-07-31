#import "APIClient.h"
#import "Models/ConnectionConfig.h"

@interface APIClient ()

@property (copy) NSString *baseURL;
@property (copy) NSString *apiKey;
@property (strong) NSURLSession *session;

@end

@implementation APIClient

// -----------------------------------------------------------------------------
#pragma mark - Singleton
// -----------------------------------------------------------------------------

+ (instancetype)shared {
    static APIClient *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[APIClient alloc] initPrivate];
    });
    return instance;
}

- (instancetype)initPrivate {
    self = [super init];
    if (self) {
        NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
        config.timeoutIntervalForRequest = 30;
        config.timeoutIntervalForResource = 120;
        self.session = [NSURLSession sessionWithConfiguration:config];

        // 加载已保存的配置
        if ([ConnectionConfig hasConfig]) {
            ConnectionConfig *cfg = [ConnectionConfig loadConfig];
            self.baseURL = cfg.serverURL;
            self.apiKey  = cfg.apiKey;
        }
    }
    return self;
}

// -----------------------------------------------------------------------------
#pragma mark - Config
// -----------------------------------------------------------------------------

- (void)updateConfigWithBaseURL:(NSString *)baseURL apiKey:(NSString *)apiKey {
    self.baseURL = baseURL;
    self.apiKey  = apiKey;
}

- (BOOL)isConfigured {
    return self.baseURL.length > 0 && self.apiKey.length > 0;
}

// -----------------------------------------------------------------------------
#pragma mark - Private Helpers
// -----------------------------------------------------------------------------

/// 构建完整 URL
- (NSURL *)URLForPath:(NSString *)path {
    NSString *encoded = [path stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]];
    return [NSURL URLWithString:[NSString stringWithFormat:@"%@/api/files/%@", self.baseURL, encoded]];
}

/// 构建带查询参数的 URL
- (NSURL *)URLForPath:(NSString *)path queryParams:(NSDictionary<NSString *,NSString *> *)params {
    NSString *base = [NSString stringWithFormat:@"%@/api/files/%@", self.baseURL, path];
    if (params.count == 0) return [NSURL URLWithString:base];

    NSMutableArray *parts = [NSMutableArray array];
    for (NSString *key in params) {
        NSString *value = [params[key] stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]];
        [parts addObject:[NSString stringWithFormat:@"%@=%@", key, value]];
    }
    NSString *queryString = [parts componentsJoinedByString:@"&"];
    return [NSURL URLWithString:[NSString stringWithFormat:@"%@?%@", base, queryString]];
}

/// 构建管理端 URL
- (NSURL *)adminURLForPath:(NSString *)path {
    return [NSURL URLWithString:[NSString stringWithFormat:@"%@/api/admin/%@", self.baseURL, path]];
}

/// 默认请求头（含认证）
- (NSMutableURLRequest *)authRequestWithURL:(NSURL *)url method:(NSString *)method {
    NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:url];
    req.HTTPMethod = method;
    [req setValue:[NSString stringWithFormat:@"Bearer %@", self.apiKey] forHTTPHeaderField:@"Authorization"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Accept"];
    return req;
}

/// 执行 JSON 请求并解析响应
- (void)performJSONRequest:(NSURLRequest *)request completion:(APICallback)completion {
    NSURLSessionDataTask *task = [self.session dataTaskWithRequest:request
                                                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) {
                completion(nil, error);
                return;
            }
            if (!data) {
                completion(nil, [NSError errorWithDomain:@"APIClient" code:-1 userInfo:@{NSLocalizedDescriptionKey: @"无返回数据"}]);
                return;
            }
            NSError *jsonError;
            NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
            if (jsonError) {
                completion(nil, jsonError);
                return;
            }
            ApiResponse *resp = [ApiResponse fromDictionary:json];
            if (!resp.isSuccess) {
                NSString *msg = resp.message ?: @"请求失败";
                NSError *apiError = [NSError errorWithDomain:@"APIError"
                                                        code:resp.code
                                                    userInfo:@{NSLocalizedDescriptionKey: msg}];
                completion(resp, apiError);
                return;
            }
            completion(resp, nil);
        });
    }];
    [task resume];
}

// -----------------------------------------------------------------------------
#pragma mark - 文件列表
// -----------------------------------------------------------------------------

- (void)listFilesAtPath:(NSString *)path completion:(APICallback)completion {
    NSURL *url = [self URLForPath:@"list" queryParams:@{@"path": path}];
    NSMutableURLRequest *req = [self authRequestWithURL:url method:@"GET"];
    [self performJSONRequest:req completion:completion];
}

// -----------------------------------------------------------------------------
#pragma mark - 下载
// -----------------------------------------------------------------------------

- (void)downloadFileAtPath:(NSString *)path toURL:(NSURL *)destination completion:(DownloadCallback)completion {
    NSURL *url = [self URLForPath:@"download" queryParams:@{@"path": path}];
    NSMutableURLRequest *req = [self authRequestWithURL:url method:@"GET"];

    NSURLSessionDownloadTask *task = [self.session downloadTaskWithRequest:req
                                                        completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) {
                completion(nil, error);
                return;
            }
            // 移动到目标位置
            [[NSFileManager defaultManager] removeItemAtURL:destination error:nil];
            NSError *moveError;
            [[NSFileManager defaultManager] moveItemAtURL:location toURL:destination error:&moveError];
            if (moveError) {
                completion(nil, moveError);
                return;
            }
            completion(destination, nil);
        });
    }];
    [task resume];
}

// -----------------------------------------------------------------------------
#pragma mark - 预览
// -----------------------------------------------------------------------------

- (void)previewFileAtPath:(NSString *)path completion:(DataCallback)completion {
    NSURL *url = [self URLForPath:@"preview" queryParams:@{@"path": path}];
    NSMutableURLRequest *req = [self authRequestWithURL:url method:@"GET"];

    NSURLSessionDataTask *task = [self.session dataTaskWithRequest:req
                                                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) {
                completion(nil, nil, error);
                return;
            }
            NSString *mimeType = @"";
            if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
                NSHTTPURLResponse *httpResp = (NSHTTPURLResponse *)response;
                mimeType = httpResp.allHeaderFields[@"Content-Type"] ?: @"";
            }
            completion(data, mimeType, nil);
        });
    }];
    [task resume];
}

// -----------------------------------------------------------------------------
#pragma mark - 上传
// -----------------------------------------------------------------------------

- (void)uploadFileAtURL:(NSURL *)fileURL toPath:(NSString *)destPath completion:(APICallback)completion {
    NSURL *url = [self URLForPath:@"upload" queryParams:nil];
    NSMutableURLRequest *req = [self authRequestWithURL:url method:@"POST"];

    NSString *boundary = [NSString stringWithFormat:@"Boundary-%@", [[NSUUID UUID] UUIDString]];
    [req setValue:[NSString stringWithFormat:@"multipart/form-data; boundary=%@", boundary] forHTTPHeaderField:@"Content-Type"];

    NSMutableData *body = [NSMutableData data];
    // path field
    [body appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[@"Content-Disposition: form-data; name=\"path\"\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[[NSString stringWithFormat:@"%@\r\n", destPath] dataUsingEncoding:NSUTF8StringEncoding]];
    // file field
    NSString *fileName = fileURL.lastPathComponent;
    [body appendData:[[NSString stringWithFormat:@"--%@\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[[NSString stringWithFormat:@"Content-Disposition: form-data; name=\"file\"; filename=\"%@\"\r\n", fileName] dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[@"Content-Type: application/octet-stream\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding]];
    [body appendData:[NSData dataWithContentsOfURL:fileURL]];
    [body appendData:[[NSString stringWithFormat:@"\r\n--%@--\r\n", boundary] dataUsingEncoding:NSUTF8StringEncoding]];

    req.HTTPBody = body;

    NSURLSessionDataTask *task = [self.session dataTaskWithRequest:req
                                                completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (error) {
                completion(nil, error);
                return;
            }
            if (!data) {
                completion(nil, [NSError errorWithDomain:@"APIClient" code:-1 userInfo:@{NSLocalizedDescriptionKey: @"无返回数据"}]);
                return;
            }
            NSError *jsonError;
            NSDictionary *json = [NSJSONSerialization JSONObjectWithData:data options:0 error:&jsonError];
            if (jsonError) {
                completion(nil, jsonError);
                return;
            }
            ApiResponse *resp = [ApiResponse fromDictionary:json];
            if (!resp.isSuccess) {
                completion(resp, [NSError errorWithDomain:@"APIError"
                                                     code:resp.code
                                                 userInfo:@{NSLocalizedDescriptionKey: resp.message ?: @"上传失败"}]);
                return;
            }
            completion(resp, nil);
        });
    }];
    [task resume];
}

// -----------------------------------------------------------------------------
#pragma mark - 创建目录
// -----------------------------------------------------------------------------

- (void)createDirectoryAtPath:(NSString *)path completion:(APICallback)completion {
    NSURL *url = [self URLForPath:@"mkdir" queryParams:nil];
    NSMutableURLRequest *req = [self authRequestWithURL:url method:@"POST"];
    [req setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];

    NSDictionary *bodyDict = @{@"path": path};
    req.HTTPBody = [NSJSONSerialization dataWithJSONObject:bodyDict options:0 error:nil];

    [self performJSONRequest:req completion:completion];
}

// -----------------------------------------------------------------------------
#pragma mark - 删除
// -----------------------------------------------------------------------------

- (void)removeItemAtPath:(NSString *)path completion:(APICallback)completion {
    NSURL *url = [self URLForPath:@"remove" queryParams:@{@"path": path}];
    NSMutableURLRequest *req = [self authRequestWithURL:url method:@"DELETE"];
    [self performJSONRequest:req completion:completion];
}

// -----------------------------------------------------------------------------
#pragma mark - 连接测试
// -----------------------------------------------------------------------------

- (void)testConnection:(void(^)(BOOL success, NSString * _Nullable errorMsg))completion {
    [self listFilesAtPath:@"/" completion:^(ApiResponse *response, NSError *error) {
        if (error) {
            completion(NO, error.localizedDescription);
        } else {
            completion(YES, nil);
        }
    }];
}

@end
