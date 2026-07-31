#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// 文件条目类型
typedef NS_ENUM(NSInteger, FileItemType) {
    FileItemTypeFile,
    FileItemTypeDirectory
};

@interface FileItem : NSObject

@property (copy)   NSString *name;
@property (copy)   NSString *path;
@property (assign) FileItemType type;
@property (assign) int64_t size;
@property (copy)   NSString *mimeType;
@property (copy)   NSString *updatedAt;

/// 是否为目录
@property (readonly) BOOL isDirectory;
/// 格式化文件大小
@property (readonly) NSString *formattedSize;
/// 按系统 Locale 格式化修改时间
@property (readonly) NSString *formattedUpdatedAt;

/// 从 API JSON 字典创建
+ (instancetype)fromDictionary:(NSDictionary *)dict;

@end

NS_ASSUME_NONNULL_END
