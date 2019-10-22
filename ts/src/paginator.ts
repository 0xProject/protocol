export const paginate = <T>(collection: T[], page: number, perPage: number) => {
    const paginatedCollection = {
        total: collection.length,
        page,
        perPage,
        records: collection.slice((page - 1) * perPage, page * perPage),
    };
    return paginatedCollection;
};
