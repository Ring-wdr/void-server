import "reflect-metadata";
import { Controller, Get, Injectable, Logger, Module, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";

@Injectable()
class FixtureLogger {
  readonly lines: string[] = [];

  log(context: string, message: string): void {
    this.lines.push(`${context}: ${message}`);
    new Logger(context).log(message);
  }
}

@Injectable()
class DatabaseService implements OnApplicationBootstrap, OnModuleDestroy {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("DatabaseService", "Primary pool opened");
    this.logger.log("MigrationRunner", "Schema migrations verified");
  }

  onModuleDestroy(): void {
    this.logger.log("DatabaseService", "Primary pool drained");
  }
}

@Injectable()
class CacheService implements OnApplicationBootstrap {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("CacheService", "Cache store warmed");
  }
}

@Injectable()
class PolicyService implements OnApplicationBootstrap {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("RbacService", "Role hierarchy indexed");
    this.logger.log("PolicyDecisionPoint", "Policy bundle warmed");
  }
}

@Injectable()
class PlatformService implements OnApplicationBootstrap {
  constructor(private readonly logger: FixtureLogger) {}

  onApplicationBootstrap(): void {
    this.logger.log("QueueWorker", "invoices queue consuming");
    this.logger.log("OutboxDispatcher", "Outbox relay caught up");
    this.logger.log("OpenTelemetryModule", "Trace exporter connected");
    this.logger.log("AuditPipeline", "Immutable audit stream ready");
    this.logger.log("SloMonitor", "Latency and error-budget monitors armed");
  }
}

@Controller()
class AppController {
  @Get()
  getRoot(): string {
    return "ok";
  }
}

@Controller("health")
class HealthController {
  @Get()
  getHealth(): string {
    return "ready";
  }
}

@Module({ providers: [FixtureLogger], exports: [FixtureLogger] })
class SharedFixtureModule {}

@Module({ imports: [SharedFixtureModule], providers: [DatabaseService], exports: [DatabaseService] })
class DatabaseModule {}

@Module({ imports: [SharedFixtureModule], providers: [CacheService] })
class CacheModule {}

@Module({ controllers: [HealthController] })
class HealthModule {}

@Module({ imports: [SharedFixtureModule], providers: [PolicyService] })
class SecurityModule {}

@Module({ imports: [SharedFixtureModule], providers: [PlatformService] })
class PlatformModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class UsersModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class OrdersModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class BillingModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class InventoryModule {}

@Module({ imports: [DatabaseModule], providers: [] })
class NotificationsModule {}

@Module({
  imports: [SharedFixtureModule],
  controllers: [AppController]
})
export class SimpleFixtureAppModule {}

@Module({
  imports: [SharedFixtureModule, DatabaseModule, CacheModule, HealthModule, UsersModule, OrdersModule]
})
export class MiddleFixtureAppModule {}

@Module({
  imports: [
    SharedFixtureModule,
    DatabaseModule,
    CacheModule,
    HealthModule,
    SecurityModule,
    PlatformModule,
    UsersModule,
    OrdersModule,
    BillingModule,
    InventoryModule,
    NotificationsModule
  ]
})
export class HeavyFixtureAppModule {}
