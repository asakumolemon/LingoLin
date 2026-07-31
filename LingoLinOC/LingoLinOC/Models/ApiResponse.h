#import <Foundation/Foundation.h>
#import "FileItem.h"

NS_ASSUME_NONNULL_BEGIN

/// 统一 API 响应包装
@interface ApiResponse : NSObject

@property (assign) NSInteger code;
@property (copy)   NSString *message;
@property (strong) id data;

@property (readonly) BOOL isSuccess;

/// 从原始 JSON 字典解析
+ (instancetype)fromDictionary:(NSDictionary *)dict;

/// 将 data 解析为 FileItem 数组（用于文件列表）
- (NSArray<FileItem *> *)parseFileList;

@end

NS_ASSUME_NONNULL_END
