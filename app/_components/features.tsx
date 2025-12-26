'use client'

import { Globe, Users, Zap } from 'lucide-react'
import { motion } from 'motion/react'

const features = [
  {
    description: 'リアルタイム通信で、全員の画面が同時に更新。遅延なく一体感を演出します。',
    icon: Zap,
    title: 'Realtime Sync',
  },
  {
    description:
      'コミュニティイベント、配信、パーティーに最適。誰でも簡単に参加でき、みんなで盛り上がれます。',
    icon: Users,
    title: 'Community First',
  },
  {
    description: 'アプリのインストール不要。URLを共有するだけで、ブラウザから即座に参加できます。',
    icon: Globe,
    title: 'No App Required',
  },
]

export function Features() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="mb-4 font-bold text-3xl text-text-main sm:text-4xl">
            なぜ Bingify を選ぶのか
          </h2>
          <p className="text-lg text-text-muted">
            シンプルで、パワフル。誰でも使える新しいビンゴ体験。
          </p>
        </motion.div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl"
                role="article"
                aria-labelledby={`feature-title-${index}`}
              >
                <motion.div
                  className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                  whileHover={{ rotate: 360 }}
                  transition={{
                    duration: 0.6,
                    type: 'spring',
                  }}
                >
                  <Icon className="h-7 w-7 text-primary" />
                </motion.div>

                <h3 className="mb-3 font-bold text-text-main text-xl" id={`feature-title-${index}`}>
                  {feature.title}
                </h3>
                <p className="text-text-muted leading-relaxed">{feature.description}</p>

                {/* Accent corner decoration */}
                <motion.div
                  className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-secondary/10"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 + 0.3, duration: 0.6 }}
                />
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
