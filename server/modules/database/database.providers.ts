import * as mongoose from 'mongoose';

export const databaseProviders = [
    {
        provide: 'MongoDbConnectionToken',
        useFactory: async () => {
            (<any>mongoose).Promise = global.Promise;
            return await mongoose.connect('mongodb://localhost/nest');
        },
    },
]