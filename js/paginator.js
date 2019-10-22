'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.paginate = function(collection, page, perPage) {
    var paginatedCollection = {
        total: collection.length,
        page: page,
        perPage: perPage,
        records: collection.slice((page - 1) * perPage, page * perPage),
    };
    return paginatedCollection;
};
