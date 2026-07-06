import ExpoModulesCore
import GameKit

/// Dismisses the GKGameCenterViewController when the player closes it.
private class GameCenterDismissDelegate: NSObject, GKGameCenterControllerDelegate {
  static let shared = GameCenterDismissDelegate()
  func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
    gameCenterViewController.dismiss(animated: true)
  }
}

public class GameCenterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("GameCenter")

    // Resolves true/false. If GameKit hands back a login view controller
    // (player not signed in), present it; the handler fires again afterwards.
    AsyncFunction("authenticate") { (promise: Promise) in
      var settled = false
      GKLocalPlayer.local.authenticateHandler = { viewController, _ in
        if let vc = viewController {
          DispatchQueue.main.async {
            Self.presentingViewController()?.present(vc, animated: true)
          }
          return
        }
        if !settled {
          settled = true
          promise.resolve(GKLocalPlayer.local.isAuthenticated)
        }
      }
    }

    AsyncFunction("submitScore") { (leaderboardId: String, value: Int) in
      guard GKLocalPlayer.local.isAuthenticated else { return }
      GKLeaderboard.submitScore(
        value,
        context: 0,
        player: GKLocalPlayer.local,
        leaderboardIDs: [leaderboardId]
      ) { _ in }
    }

    AsyncFunction("reportAchievement") { (id: String, percent: Double) in
      guard GKLocalPlayer.local.isAuthenticated else { return }
      let achievement = GKAchievement(identifier: id)
      achievement.percentComplete = percent
      achievement.showsCompletionBanner = true
      GKAchievement.report([achievement]) { _ in }
    }

    AsyncFunction("presentLeaderboard") { (leaderboardId: String) in
      guard GKLocalPlayer.local.isAuthenticated else { return }
      DispatchQueue.main.async {
        let vc = GKGameCenterViewController(
          leaderboardID: leaderboardId,
          playerScope: .global,
          timeScope: .allTime
        )
        vc.gameCenterDelegate = GameCenterDismissDelegate.shared
        Self.presentingViewController()?.present(vc, animated: true)
      }
    }
  }

  /// Topmost view controller of the key window — where sheets get presented from.
  private static func presentingViewController() -> UIViewController? {
    let root = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first?.rootViewController
    var top = root
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}
