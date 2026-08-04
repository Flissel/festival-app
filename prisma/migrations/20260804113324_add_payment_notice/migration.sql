-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('neu', 'uebernommen', 'ignoriert');

-- CreateTable
CREATE TABLE "PaymentNotice" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "senderName" TEXT,
    "senderEmail" TEXT,
    "transactionCode" TEXT,
    "subject" TEXT NOT NULL,
    "dkimVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "NoticeStatus" NOT NULL DEFAULT 'neu',
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentNotice_messageId_key" ON "PaymentNotice"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentNotice_paymentId_key" ON "PaymentNotice"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentNotice_status_receivedAt_idx" ON "PaymentNotice"("status", "receivedAt");

-- AddForeignKey
ALTER TABLE "PaymentNotice" ADD CONSTRAINT "PaymentNotice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
