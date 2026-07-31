#import "FileItem.h"

@implementation FileItem

- (BOOL)isDirectory {
    return self.type == FileItemTypeDirectory;
}

- (NSString *)formattedSize {
    if (self.isDirectory) return @"--";

    double bytes = (double)self.size;
    if (bytes < 1024) return [NSString stringWithFormat:@"%.0f B", bytes];
    if (bytes < 1024 * 1024) return [NSString stringWithFormat:@"%.1f KB", bytes / 1024.0];
    if (bytes < 1024 * 1024 * 1024) return [NSString stringWithFormat:@"%.1f MB", bytes / (1024.0 * 1024.0)];
    return [NSString stringWithFormat:@"%.2f GB", bytes / (1024.0 * 1024.0 * 1024.0)];
}

- (NSString *)formattedUpdatedAt {
    if (self.updatedAt.length == 0) return self.updatedAt;

    NSDate *date = nil;
    NSISO8601DateFormatter *isoFormatter = [[NSISO8601DateFormatter alloc] init];
    isoFormatter.formatOptions = NSISO8601DateFormatWithInternetDateTime | NSISO8601DateFormatWithFractionalSeconds;
    date = [isoFormatter dateFromString:self.updatedAt];
    if (!date) {
        isoFormatter.formatOptions = NSISO8601DateFormatWithInternetDateTime;
        date = [isoFormatter dateFromString:self.updatedAt];
    }

    if (!date) {
        static NSArray<NSString *> *formats;
        static dispatch_once_t onceToken;
        dispatch_once(&onceToken, ^{
            formats = @[
                @"yyyy-MM-dd'T'HH:mm:ss.SSS",
                @"yyyy-MM-dd'T'HH:mm:ss",
                @"yyyy-MM-dd HH:mm:ss",
                @"yyyy-MM-dd HH:mm",
                @"yyyy-MM-dd"
            ];
        });

        for (NSString *format in formats) {
            NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
            formatter.locale = [[NSLocale alloc] initWithLocaleIdentifier:@"en_US_POSIX"];
            formatter.timeZone = [NSTimeZone timeZoneForSecondsFromGMT:0];
            formatter.dateFormat = format;
            date = [formatter dateFromString:self.updatedAt];
            if (date) break;
        }
    }

    if (!date) return self.updatedAt;

    static NSDateFormatter *displayFormatter;
    static dispatch_once_t displayOnceToken;
    dispatch_once(&displayOnceToken, ^{
        displayFormatter = [[NSDateFormatter alloc] init];
        displayFormatter.dateStyle = NSDateFormatterMediumStyle;
        displayFormatter.timeStyle = NSDateFormatterShortStyle;
    });
    displayFormatter.locale = [NSLocale currentLocale];
    return [displayFormatter stringFromDate:date];
}

+ (instancetype)fromDictionary:(NSDictionary *)dict {
    FileItem *item = [[FileItem alloc] init];
    item.name      = dict[@"name"] ?: @"";
    item.path      = dict[@"path"] ?: @"";
    item.size      = [dict[@"size"] longLongValue];
    item.mimeType  = dict[@"mime_type"] ?: @"";
    item.updatedAt = dict[@"updated_at"] ?: @"";

    NSString *typeStr = dict[@"type"] ?: @"file";
    item.type = [typeStr isEqualToString:@"dir"] ? FileItemTypeDirectory : FileItemTypeFile;

    return item;
}

@end
