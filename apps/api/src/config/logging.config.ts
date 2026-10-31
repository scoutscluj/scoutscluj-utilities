import { ConsoleLogger } from '@nestjs/common';

export const createApplicationLogger = (
  environment = process.env.NODE_ENV,
): ConsoleLogger => {
  const production = environment === 'production';

  return new ConsoleLogger({
    json: production,
    colors: !production,
  });
};
