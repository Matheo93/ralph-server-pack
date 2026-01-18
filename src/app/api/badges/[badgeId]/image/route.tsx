import { ImageResponse } from 'next/og'
import { queryOne } from '@/lib/aws/database'


interface Badge {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  xp_reward: number
}

interface ChildBadge {
  unlocked_at: string
  child_name: string
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ badgeId: string }> }
) {
  const { badgeId } = await params
  const { searchParams } = new URL(request.url)
  const childId = searchParams.get('childId')

  try {
    // Récupérer le badge
    const badge = await queryOne<Badge>(
      `SELECT id, slug, name, description, icon, xp_reward 
       FROM badges WHERE slug = $1 OR (id::text = $1)`,
      [badgeId]
    )

    if (!badge) {
      return new Response('Badge not found', { status: 404 })
    }

    // Récupérer les infos enfant si childId fourni
    let childBadge: ChildBadge | null = null
    if (childId) {
      childBadge = await queryOne<ChildBadge>(
        `SELECT cb.unlocked_at, c.first_name as child_name
         FROM child_badges cb
         JOIN children c ON c.id = cb.child_id
         WHERE cb.badge_id = $1 AND cb.child_id = $2`,
        [badge.id, childId]
      )
    }

    const unlockedDate = childBadge?.unlocked_at
      ? new Date(childBadge.unlocked_at).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            padding: 40,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Étoiles décoratives */}
          <div
            style={{
              position: 'absolute',
              top: 30,
              left: 40,
              fontSize: 40,
              opacity: 0.6,
            }}
          >
            ✨
          </div>
          <div
            style={{
              position: 'absolute',
              top: 60,
              right: 60,
              fontSize: 30,
              opacity: 0.5,
            }}
          >
            🌟
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 80,
              left: 80,
              fontSize: 35,
              opacity: 0.4,
            }}
          >
            ⭐
          </div>

          {/* Badge icon */}
          <div
            style={{
              fontSize: 120,
              marginBottom: 20,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          >
            {badge.icon}
          </div>

          {/* Badge name */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: 10,
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {badge.name}
          </div>

          {/* Child name if available */}
          {childBadge?.child_name && (
            <div
              style={{
                fontSize: 28,
                color: 'rgba(255,255,255,0.9)',
                marginBottom: 8,
              }}
            >
              🎉 Débloqué par {childBadge.child_name}
            </div>
          )}

          {/* Date */}
          {unlockedDate && (
            <div
              style={{
                fontSize: 20,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              Le {unlockedDate}
            </div>
          )}

          {/* XP Reward */}
          {badge.xp_reward > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 20,
                background: 'rgba(255,255,255,0.2)',
                padding: '10px 24px',
                borderRadius: 30,
              }}
            >
              <span style={{ fontSize: 24 }}>💎</span>
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: 'white',
                }}
              >
                +{badge.xp_reward} XP
              </span>
            </div>
          )}

          {/* FamilyLoad branding */}
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🏠</span>
            <span>FamilyLoad Kids</span>
          </div>
        </div>
      ),
      {
        width: 600,
        height: 400,
      }
    )
  } catch (error) {
    console.error('Error generating badge image:', error)
    return new Response('Error generating image', { status: 500 })
  }
}
