import { Get, Controller } from '@nestjs/common';

@Controller()
export class AppController {
    @Get()
    root(): boolean {
        console.log(`Call root route '/'`);
        return true;
    }

    @Get('index.htm')
    bad(): string {
        return 'Hello';
    }
}
