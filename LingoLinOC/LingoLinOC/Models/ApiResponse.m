#import "ApiResponse.h"

@implementation ApiResponse

- (BOOL)isSuccess {
    return self.code == 0;
}

+ (instancetype)fromDictionary:(NSDictionary *)dict {
    ApiResponse *resp = [[ApiResponse alloc] init];
    resp.code    = [dict[@"code"] integerValue];
    resp.message = dict[@"message"] ?: @"";
    resp.data    = dict[@"data"];
    return resp;
}

- (NSArray<FileItem *> *)parseFileList {
    if (![self.data isKindOfClass:[NSDictionary class]]) return @[];

    NSArray *items = ((NSDictionary *)self.data)[@"items"];
    if (![items isKindOfClass:[NSArray class]]) return @[];

    NSMutableArray *result = [NSMutableArray arrayWithCapacity:items.count];
    for (NSDictionary *itemDict in items) {
        if ([itemDict isKindOfClass:[NSDictionary class]]) {
            [result addObject:[FileItem fromDictionary:itemDict]];
        }
    }
    return result;
}

@end
