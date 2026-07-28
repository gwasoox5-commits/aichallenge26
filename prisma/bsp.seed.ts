import { Prisma, PrismaClient } from ".prisma/bsp-client";
import { DEMO_JOIN_CODE } from "../src/bsp/domain/auth/demo-constants";
import { DEFAULT_ECONOMY_VALUES, DEFAULT_ORG_ID } from "../src/bsp/domain/types";

const prisma = new PrismaClient();

async function main() {
  await prisma.bspOrganization.upsert({
    where: { id: DEFAULT_ORG_ID },
    create: { id: DEFAULT_ORG_ID, name: "BSP Demo Organization" },
    update: {},
  });

  const session = await prisma.bspGameSession.upsert({
    where: { joinCode: DEMO_JOIN_CODE },
    create: {
      organizationId: DEFAULT_ORG_ID,
      name: "Sprint 1 Demo",
      joinCode: DEMO_JOIN_CODE,
      sessionPhase: "RUNNING",
      startedAt: new Date(),
      economy: {
        create: { values: DEFAULT_ECONOMY_VALUES as unknown as Prisma.InputJsonValue, version: 0 },
      },
      periods: {
        create: { periodIndex: 1, year: 1, half: "H1", label: "Year 1 H1", status: "OPEN" },
      },
    },
    update: {},
    include: { periods: true },
  });

  const period = session.periods[0];
  await prisma.bspGameProgress.upsert({
    where: { sessionId: session.id },
    create: {
      sessionId: session.id,
      sessionPhase: "RUNNING",
      periodId: period.id,
      stepPhase: "STEP1_FINANCE",
    },
    update: {},
  });

  console.log("BSP seed complete:", { sessionId: session.id, joinCode: session.joinCode });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
