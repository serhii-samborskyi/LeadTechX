ALTER TABLE public."AppSettings"
ADD COLUMN "fastAgentBuildsPerIpPerHour" INTEGER NOT NULL DEFAULT 5;
